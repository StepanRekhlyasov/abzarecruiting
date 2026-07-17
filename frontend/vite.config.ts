import path from 'node:path'
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

function withForwardedHost(proxyOptions: ProxyOptions): ProxyOptions {
  return {
    ...proxyOptions,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const host = req.headers.host
        if (host) {
          proxyReq.setHeader('X-Forwarded-Host', host)
        }

        const incomingProto = req.headers['x-forwarded-proto']
        const protoHeader = Array.isArray(incomingProto) ? incomingProto[0] : incomingProto
        const proto = protoHeader?.split(',')[0]?.trim() || 'http'
        proxyReq.setHeader('X-Forwarded-Proto', proto)
      })
    },
  }
}

const backendProxy = withForwardedHost({
  target: 'http://backend:8080',
  changeOrigin: true,
})

export default defineConfig({
  server: {
    host: true,
    port: 80,
    watch: { usePolling: true },
    proxy: {
      '/api': backendProxy,
      '/signin-google': backendProxy,
      '/signin-facebook': backendProxy,
      '/ws': withForwardedHost({
        target: 'http://backend:8080',
        ws: true,
        changeOrigin: true,
      }),
      '/swagger': backendProxy,
      '/phpmyadmin': {
        target: 'http://phpmyadmin:80',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/phpmyadmin\/?/, '/'),
      },
    },
    allowedHosts: ['abzabza.ru', 'localhost', '127.0.0.1', '44.194.248.98'],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@features': path.resolve(__dirname, './src/features'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
