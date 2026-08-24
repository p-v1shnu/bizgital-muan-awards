# ── build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_* values are inlined at build time, so they arrive as build args.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_IMAGE_BASE_URL
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_IMAGE_BASE_URL=$NEXT_PUBLIC_IMAGE_BASE_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
RUN npm run build

# ── runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Vientiane
RUN apk add --no-cache tzdata

# `--chown` on every line: without it these land owned by root, and the
# `node` user below can create files nowhere under /app — including its own
# `.next/cache`, which Next tries to create at runtime and silently fails to
# on every request, logged as "Failed to update prerender cache".
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Docker sets HOSTNAME to the container's own hostname by default, and the
# standalone server.js binds to that literally instead of falling back to
# every interface — so it ends up reachable only on the container's own IP,
# never on 127.0.0.1 (which is what the healthcheck, and any loopback probe,
# uses). Override it back to the wildcard address.
ENV HOSTNAME=0.0.0.0

USER node
EXPOSE 3000
CMD ["node", "server.js"]
