import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    host: true,
    port: 80,
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://backend:8080',
        ws: true,
        changeOrigin: true,
      },
      '/swagger': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
      '/phpmyadmin': {
        target: 'http://phpmyadmin:80',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/phpmyadmin\/?/, '/'),
      },
    },
    allowedHosts: ['abzabza.ru'],
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
