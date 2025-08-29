# Multi-stage build for Buzz platform monorepo
FROM node:20-alpine AS base

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Install dependencies
FROM base AS deps
# Copy the full source first for workspace dependencies
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
# Copy everything from deps stage (includes source + node_modules)
COPY --from=deps /app ./

# Build the apps
RUN pnpm --filter=buzz run build
RUN pnpm --filter=buzz-admin run build || echo "Admin build failed, continuing..."

# Production stage for buzz app
FROM nginx:alpine AS buzz-production
COPY --from=builder /app/apps/buzz/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Production stage for buzz-admin app  
FROM nginx:alpine AS buzz-admin-production
COPY --from=builder /app/apps/buzz-admin/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Production stage for buzz-biz app
FROM nginx:alpine AS buzz-biz-production
COPY --from=builder /app/apps/buzz-biz/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000 8083 3002
CMD ["pnpm", "run", "dev"]