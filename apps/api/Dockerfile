# Zerorez Collections Performance Hub — API image
# Build from the monorepo root:
#   docker build -f apps/api/Dockerfile -t zerorez-api .
FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter @zerorez/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @zerorez/shared build \
  && pnpm --filter @zerorez/api build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --prod --filter @zerorez/api...

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3001
ENV PORT=3001

USER node
CMD ["node", "dist/index.js"]
