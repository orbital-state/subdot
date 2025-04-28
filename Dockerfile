# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Copy package files and install dependencies without triggering scripts
COPY *.json ./
RUN npm ci --ignore-scripts

# Add node_modules/.bin to PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy all files (including src) and run the build command
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-slim

WORKDIR /app

# Copy built files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built assets and configuration
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/subdot.toml /app/subdot.toml

# Specify the ENTRYPOINT to run the built CLI
ENTRYPOINT ["node", "dist/index.js"]
CMD ["worker", "--config", "/app/subdot.toml"]
