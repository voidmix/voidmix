# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS build
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

# Railway passes service variables as build args only when declared here.
# Vite embeds this public origin in both the browser and SSR output.
ARG VITE_API_URL
RUN : "${VITE_API_URL:?Set VITE_API_URL to the standalone API origin before building Web}" \
    && bun run --cwd apps/web build

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0

WORKDIR /app/apps/web

COPY --chown=node:node --from=build /app/apps/web/package.json ./package.json
COPY --chown=node:node --from=build /app/apps/web/.output ./.output

USER node
EXPOSE 3000

CMD ["sh", "-c", "if [ -f /app/.env ]; then exec node --env-file=/app/.env --enable-source-maps .output/server/index.mjs; else exec node --enable-source-maps .output/server/index.mjs; fi"]
