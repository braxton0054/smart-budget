# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN npm run build

# One-shot service: the app container waits for this to finish successfully.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
USER node
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--dns-result-order=ipv4first
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
