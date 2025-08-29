# Multi-stage build for Buzz Business App

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy shared packages
COPY packages/shared ./packages/shared

# Copy app specific files
COPY apps/buzz-biz/package.json ./apps/buzz-biz/
COPY apps/buzz-biz ./apps/buzz-biz

# Install dependencies (force to recreate lockfile if needed)
RUN pnpm install || pnpm install --force

# Build the app
ARG BUILD_ENV=production
RUN cd apps/buzz-biz && pnpm build

# Stage 2: Production
FROM nginx:alpine

# Copy nginx config
COPY apps/buzz-biz/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/apps/buzz-biz/dist /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]