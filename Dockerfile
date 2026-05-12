# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /repo

# Activate pnpm via corepack using the version pinned in package.json.
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Signals non-interactive context so `pnpm prune` won't prompt for a TTY.
ENV CI=true

# Workspace manifests first for cache efficiency on dep-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/design-system/package.json ./packages/design-system/
RUN pnpm install --frozen-lockfile

# Bring in the rest of the source and build DS then app via turbo.
COPY . .
RUN pnpm turbo run build --filter=web...

# Drop dev dependencies across all workspaces so we can copy a slim tree.
RUN pnpm prune --prod

# ---------- Runtime stage ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Cloud Run injects PORT (defaults to 8080); adapter-node honors it.
ENV PORT=8080
ENV HOST=0.0.0.0

# Preserve the workspace layout so the @me/design-system symlink in
# node_modules still resolves at runtime.
COPY --from=builder /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/web/package.json ./apps/web/package.json
COPY --from=builder /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /repo/apps/web/build ./apps/web/build
COPY --from=builder /repo/packages/design-system/package.json ./packages/design-system/package.json
COPY --from=builder /repo/packages/design-system/dist ./packages/design-system/dist

EXPOSE 8080
CMD ["node", "apps/web/build"]
