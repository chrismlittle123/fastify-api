# Build stage
FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy package files and lockfile
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# Copy package files and lockfile
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R fastify:nodejs /app

# Switch to non-root user
USER fastify

# Cloud Run uses PORT environment variable
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the production server
CMD ["node", "dist/server.js"]
