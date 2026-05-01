# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Install all dependencies (including dev) for the build
COPY package.json package-lock.json ./
RUN npm ci

# Build the SvelteKit app (adapter-node outputs to /app/build)
COPY . .
RUN npm run build

# Drop dev dependencies so we can copy a slim node_modules to the runner
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Cloud Run injects PORT (defaults to 8080); adapter-node honors it.
ENV PORT=8080
ENV HOST=0.0.0.0

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
CMD ["node", "build"]
