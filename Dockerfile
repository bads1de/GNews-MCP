# ===================================================================
# Stage 1: Build stage
# ステージ1: ビルドステージ
# ===================================================================
FROM node:20-alpine AS builder

# Set working directory
# 作業ディレクトリを設定
WORKDIR /app

# Copy package files for dependency installation
# 依存関係のインストールのためのpackageファイルをコピー
COPY package*.json ./

# Install dependencies with caching
# キャッシュを使用して依存関係をインストール
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Copy source files
# ソースファイルをコピー
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application manually (avoid prepare script)
# アプリケーションを手動でビルド（prepareスクリプトを回避）
RUN npx tsc && npx shx chmod +x dist/*.js

# ===================================================================
# Stage 2: Production stage
# ステージ2: 本番ステージ
# ===================================================================
FROM node:20-alpine AS release

# Set working directory
# 作業ディレクトリを設定
WORKDIR /app

# Copy package files for production dependencies
# 本番環境の依存関係のためのpackageファイルをコピー
COPY package*.json ./

# Install only production dependencies
# 本番環境の依存関係のみをインストール
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts

# Copy built files from builder stage
# ビルドステージからビルドされたファイルをコピー
COPY --from=builder /app/dist ./dist

# Set environment to production
# 環境を本番に設定
ENV NODE_ENV=production

# Run the server
# サーバーを実行
CMD ["node", "dist/index.js"]
