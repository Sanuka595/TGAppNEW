# ── Base: install all deps ──────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json  ./packages/shared/
COPY packages/client/package*.json  ./packages/client/
COPY packages/server/package*.json  ./packages/server/

RUN npm ci

# ── Shared build ────────────────────────────────────────────────────────────
FROM base AS shared-build
COPY tsconfig.base.json ./
COPY packages/shared/   ./packages/shared/
RUN npm run build -w @tgperekup/shared

# ── Server ──────────────────────────────────────────────────────────────────
FROM shared-build AS server
COPY packages/server/ ./packages/server/
RUN npm run build -w @tgperekup/server
EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]

# ── Client (Vite build) ─────────────────────────────────────────────────────
FROM shared-build AS client-build
COPY packages/client/ ./packages/client/
RUN npm run build -w @tgperekup/client

# ── Client (nginx serve) ────────────────────────────────────────────────────
FROM nginx:alpine AS client
COPY --from=client-build /app/packages/client/dist /usr/share/nginx/html
EXPOSE 80
