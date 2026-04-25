# ── Base: install all deps ──────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# Copy root manifest and workspace manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy configuration files
COPY tsconfig.base.json ./

# ── Shared build ────────────────────────────────────────────────────────────
FROM base AS shared-build
COPY packages/shared/ ./packages/shared/
RUN npm run build -w @tgperekup/shared

# ── Server Build & Run ──────────────────────────────────────────────────────
FROM shared-build AS server
COPY packages/server/ ./packages/server/
RUN npm run build -w @tgperekup/server

# Railway specific: server should listen on PORT env var
ENV PORT=3000
EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]

# ── Client Build (Optional, if used separately) ────────────────────────────
FROM shared-build AS client-build
COPY packages/client/ ./packages/client/
RUN npm run build -w @tgperekup/client

# Client serve (example using nginx)
FROM nginx:alpine AS client
COPY --from=client-build /app/packages/client/dist /usr/share/nginx/html
EXPOSE 80
