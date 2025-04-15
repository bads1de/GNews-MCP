# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS release

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment to production
ENV NODE_ENV=production

# Run the server
ENTRYPOINT ["node", "dist/index.js"]
