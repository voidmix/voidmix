# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS build
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/api build

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production

WORKDIR /app/apps/api

COPY --chown=node:node --from=build /app/apps/api/.output ./.output
COPY --chown=node:node --from=build /app/apps/api/scripts ./scripts

USER node
EXPOSE 3002

CMD ["sh", "-c", "if [ -f /app/.env ]; then exec node --env-file=/app/.env --enable-source-maps scripts/start.mjs; else exec node --enable-source-maps scripts/start.mjs; fi"]
