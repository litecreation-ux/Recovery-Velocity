# syntax=docker/dockerfile:1
# Build both workspace artifacts with the lockfile, then keep only the API's
# production dependency closure plus the two compiled outputs.
FROM node:22-bookworm-slim AS build

WORKDIR /app
# Match the pnpm major used to produce the committed lockfile/workspace setup.
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

COPY . .
RUN pnpm install --frozen-lockfile

# This key is public by design, but must be present when Vite compiles Clerk.
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV NODE_ENV=production \
    BASE_PATH=/ \
    PORT=5173 \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

RUN pnpm --filter @workspace/rvp run build \
 && pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/api-server --prod deploy --legacy /opt/api-runtime

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    RVP_STATIC_DIR=/app/public

COPY --from=build --chown=node:node /opt/api-runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./dist
COPY --from=build --chown=node:node /app/artifacts/rvp/dist/public ./public

USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]