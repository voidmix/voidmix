# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN bun install --frozen-lockfile
RUN bun run --cwd apps/admin build

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0

WORKDIR /app/apps/admin

COPY --chown=node:node --from=build /app/apps/admin/package.json ./package.json
COPY --chown=node:node --from=build /app/apps/admin/.output ./.output

USER node
EXPOSE 3000

CMD ["sh", "-c", "if [ -f /app/.env ]; then exec node --env-file=/app/.env --enable-source-maps .output/server/index.mjs; else exec node --enable-source-maps .output/server/index.mjs; fi"]
