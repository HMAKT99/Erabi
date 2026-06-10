# Parameterized image for any deployable workspace package:
#   docker build --build-arg PKG=@erabi/node -t erabi-node .
#   docker build --build-arg PKG=@erabi/explorer \
#     --build-arg NEXT_PUBLIC_ERABI_REGISTRY_URL=https://registry.example.com ... -t erabi-explorer .
FROM node:20-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

ARG PKG=@erabi/node
# NEXT_PUBLIC_* are baked into Next.js bundles at build time.
ARG NEXT_PUBLIC_ERABI_REGISTRY_URL
ARG NEXT_PUBLIC_ERABI_EXCHANGE_URL
ARG NEXT_PUBLIC_ERABI_ATTRIBUTION_URL
ARG NEXT_PUBLIC_ERABI_REPUTATION_URL
ARG NEXT_PUBLIC_ERABI_EXPLORER_URL

COPY . .
RUN pnpm install --frozen-lockfile --filter "${PKG}..."
# Schemas codegen normally runs through turbo's task graph.
RUN pnpm --filter @erabi/schemas codegen || true
RUN pnpm --filter "${PKG}..." build
RUN pnpm deploy --filter "${PKG}" --prod /out

FROM node:20-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY --from=build /out /app
ENV NODE_ENV=production
CMD ["pnpm", "start"]
