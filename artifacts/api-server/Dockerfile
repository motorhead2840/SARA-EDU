# ─── Shri Academy — api-server Dockerfile ────────────────────────────────────
# Build context: repo root (pnpm workspace)
# Output: Node.js 20 slim image running esbuild-bundled dist/index.mjs on PORT 8080
#
# Build args:
#   BUILD_SHA  — git SHA injected by CI
#   BUILD_DATE — ISO timestamp injected by CI

# ── Stage 1: deps + build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG BUILD_SHA=dev
ARG BUILD_DATE=unknown

WORKDIR /build

# pnpm via corepack (matches the version in package.json#packageManager if set)
RUN corepack enable && corepack prepare pnpm@10 --activate

# ① Workspace manifests — copied first for better layer cache
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# ② Lib workspace packages (api-server may import from lib/*)
COPY lib/ ./lib/

# ③ api-server manifest + build script only (source comes later)
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/api-server/build.mjs    artifacts/api-server/

# ④ Full workspace install (frozen — CI should never modify the lockfile)
RUN pnpm install --frozen-lockfile

# ⑤ Copy source and build (esbuild → dist/index.mjs + pino workers)
COPY artifacts/api-server/src/ artifacts/api-server/src/
RUN pnpm --filter @workspace/api-server run build

# ⑥ Deploy: extract only this package's production node_modules into /deploy
#    This includes externalized packages (stripe-sync, @aws-sdk/*, etc.)
RUN pnpm --filter @workspace/api-server deploy --prod --legacy /deploy/api-server

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Production node_modules (externalized packages that esbuild did NOT bundle)
COPY --from=builder /deploy/api-server/node_modules ./node_modules

# Bundled application (index.mjs + pino worker threads)
COPY --from=builder /build/artifacts/api-server/dist ./dist

ENV NODE_ENV=production \
    PORT=8080 \
    BUILD_SHA=${BUILD_SHA} \
    BUILD_DATE=${BUILD_DATE}

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
