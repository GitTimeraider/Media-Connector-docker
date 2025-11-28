# Build stage for React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --omit=dev
COPY client/ ./
RUN npm run build

# Build stage for backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend dependencies and code
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package*.json ./
COPY --from=backend-build /app/server ./server

# Copy frontend build
COPY --from=frontend-build /app/client/build ./client/build

# Create config directory
RUN mkdir -p /config && chown -R node:node /config

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server/index.js"]
