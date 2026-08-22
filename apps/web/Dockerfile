# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS build
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/web build

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0

WORKDIR /app/apps/web

COPY --chown=node:node --from=build /app/apps/web/package.json ./package.json
COPY --chown=node:node --from=build /app/apps/web/.output ./.output

USER node
EXPOSE 3000

CMD ["node", "--env-file-if-exists=/app/.env", "--enable-source-maps", ".output/server/index.mjs"]
