# ==============================================================================
# Stage 1: Build Frontend (Vite + React 19 + TailwindCSS v4)
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Build Backend Server (TypeScript + Express + SQLite)
# ==============================================================================
FROM node:22-bookworm-slim AS server-builder
WORKDIR /app/server

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json* ./
RUN npm install

COPY server/ ./
RUN npm run build

# ==============================================================================
# Stage 3: Production Runner
# ==============================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/plataforma.db
ENV UPLOADS_DIR=/app/uploads
ENV STATIC_PATH=/app/public

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=server-builder /app/server/dist ./dist
COPY --from=frontend-builder /app/dist ./public

RUN mkdir -p /app/data /app/uploads

VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });" || exit 1

CMD ["node", "dist/index.js"]
