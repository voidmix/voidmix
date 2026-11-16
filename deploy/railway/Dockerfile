# syntax=docker/dockerfile:1
# Railway builds only the final stage of a Dockerfile and requires service-specific cache-mount
# IDs, so the root Dockerfile's named targets and cache mounts cannot be used there. This file
# mirrors its build stages without cache mounts and selects the image with a build argument.
#
# Per Railway service: RAILWAY_DOCKERFILE_PATH=deploy/railway/Dockerfile and IMAGE_TARGET=web or
# IMAGE_TARGET=api. Railway passes service variables to declared build arguments. Keep the build
# stages aligned with the root Dockerfile.
ARG BUN_VERSION=1.4.4
ARG IMAGE_TARGET=api

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
RUN bun install --frozen-lockfile

FROM dependencies AS builder
COPY --from=pruner /app/out/full/ ./
RUN bun run build:api && bun run build:web
RUN bun build ./packages/db/scripts/migrate.ts --target=bun --outfile=/out/db/scripts/migrate.mjs

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0
USER bun

FROM runtime AS api
ENV PORT=3002
COPY --from=builder --chown=bun:bun /app/apps/api/.output/ ./.output/
# Railway has no separate migration job: the service's pre-deploy command runs
# `bun db/scripts/migrate.mjs` in this image before the new deployment receives traffic.
COPY --from=builder --chown=bun:bun /out/db/ ./db/
COPY --from=builder --chown=bun:bun /app/packages/db/drizzle/ ./db/drizzle/
# CMD, not ENTRYPOINT, so the pre-deploy command replaces it instead of becoming its argument.
CMD ["bun", ".output/server/index.mjs"]

FROM runtime AS web
ENV PORT=3000
COPY --from=builder --chown=bun:bun /app/apps/web/.output/ ./.output/
CMD ["bun", ".output/server/index.mjs"]

FROM ${IMAGE_TARGET}
