# Dockerfile for subdot
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN NO_PREBUILD=true npm ci
COPY . .
RUN npm run build \
    && chmod +x dist/index.js \
    && ln -s /app/dist/index.js /usr/local/bin/subdot \
    && npm cache clean --force \
    && npm prune --omit=dev

ENV PATH="/app/node_modules/.bin:${PATH}"

ENTRYPOINT ["subdot"]
CMD ["worker", "--config", "/app/subdot.toml"]
