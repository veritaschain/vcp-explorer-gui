# VCP Explorer GUI - Production Dockerfile
# Multi-stage build for optimized image size

# Build stage
FROM node:24.22.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json .npmrc ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
# Official multi-platform stable-alpine index verified on 2026-11-02.
# See docs/CONTAINER_SECURITY.md for provenance and update instructions.
FROM nginx/nginx-unprivileged:stable-alpine@sha256:44e74ca483234093081138b6d7b6f561d55557756a2deefc3a5056148defeb99 AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Keep the runtime user explicit; no privileged port or root process is needed.
USER 101:101

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
