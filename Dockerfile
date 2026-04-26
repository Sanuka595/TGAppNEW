FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install ALL dependencies (including dev for building)
RUN npm ci --include=dev

# Copy source and configs
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# Build shared first
RUN npm run build -w @tgperekup/shared

# Build client (to generate dist for server)
RUN npm run build -w @tgperekup/client

# Build server
RUN npm run build -w @tgperekup/server

# Final cleanup: we could remove devDeps but let's keep it simple for now
# to ensure everything works.

EXPOSE 3000
ENV PORT=3000

CMD ["node", "packages/server/dist/src/index.js"]
