# React
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack install
RUN pnpm install --frozen-lockfile
COPY . .

FROM base AS build-stage
RUN pnpm run build

FROM base AS dev-stage
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 80
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

# Nginx (production only)
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
