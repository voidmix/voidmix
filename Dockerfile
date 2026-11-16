# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION}-debian AS base
WORKDIR /app

FROM base AS pruner
ARG TURBO_VERSION=2.11.11
RUN bun install --global turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune @voidmix/api-server @voidmix/web --docker

FROM base AS dependencies
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY bunfig.toml ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

FROM dependencies AS builder
COPY --from=pruner /app/out/full/ ./
RUN bun run build:api && bun run build:web
RUN bun build ./packages/db/scripts/migrate.ts --target=bun --outfile=/out/db/scripts/migrate.mjs \
    && bun build ./packages/storage/scripts/init-deploy.ts --target=bun --outfile=/out/init-storage.mjs

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0
USER bun

FROM runtime AS api
ENV PORT=3002
COPY --from=builder --chown=bun:bun /app/apps/api/.output/ ./.output/
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "const response = await fetch('http://127.0.0.1:3002/health'); process.exit(response.ok ? 0 : 1)"]
ENTRYPOINT ["bun", ".output/server/index.mjs"]

FROM runtime AS web
ENV PORT=3000
COPY --from=builder --chown=bun:bun /app/apps/web/.output/ ./.output/
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "const response = await fetch('http://127.0.0.1:3000/'); process.exit(response.ok ? 0 : 1)"]
ENTRYPOINT ["bun", ".output/server/index.mjs"]

FROM runtime AS migrate
COPY --from=builder --chown=bun:bun /out/db/ ./db/
COPY --from=builder --chown=bun:bun /app/packages/db/drizzle/ ./db/drizzle/
ENTRYPOINT ["bun", "db/scripts/migrate.mjs"]

FROM runtime AS storage-init
COPY --from=builder --chown=bun:bun /out/init-storage.mjs ./init-storage.mjs
ENTRYPOINT ["bun", "init-storage.mjs"]
