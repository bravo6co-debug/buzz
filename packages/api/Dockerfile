# Multi-stage build for Buzz API Server

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/api ./packages/api

# Install dependencies (force if lockfile incompatible)
RUN pnpm install --frozen-lockfile || pnpm install --force

# Build packages
RUN pnpm --filter @buzz/shared build
RUN pnpm --filter @buzz/database build
RUN pnpm --filter @buzz/api build

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm for production
RUN npm install -g pnpm@8

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy built packages
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod --force

# Expose port
EXPOSE 8083

# Set environment
ENV NODE_ENV=production
ENV PORT=8083
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8083/health || exit 1

# Start the API server
CMD ["node", "packages/api/dist/index.js"]