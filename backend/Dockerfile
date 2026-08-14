# ── build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ── runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Vientiane

# openssl is needed by the Prisma query engine on alpine.
RUN apk add --no-cache openssl tzdata

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3001
# Migrations run at start so a deploy never needs a manual step.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
