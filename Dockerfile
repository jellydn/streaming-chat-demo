# ---- Build Stage: Vite frontend ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.server.json ./
COPY vite.config.ts index.html ./
COPY server/ ./server/
COPY src/ ./src/

RUN npm run build

# ---- Production Stage: Hono server + static files ----
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server ./server

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["node", "--import", "tsx/esm", "server/index.ts"]
