FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

# The named auth volume inherits this ownership on first creation, so the
# unprivileged process can write Baileys' 0600 files.
RUN mkdir -p /data/baileys && chown -R node:node /data

USER node

CMD ["node", "src/index.mjs"]
