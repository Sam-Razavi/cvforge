FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig*.json nest-cli.json ./
COPY prisma/ ./prisma/
COPY scripts/ ./scripts/
COPY src/ ./src/

RUN npm ci
RUN npm run build

# --- production image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma/ ./prisma/

# skip postinstall (prisma generate) — compiled client is already in dist/
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# migrate then start (Railway / Docker Compose)
CMD ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node dist/main"]
