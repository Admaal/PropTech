# ponytail: build desde raíz del monorepo (context: .)
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
# ponytail: hoisted linker evita fallos de resolución TS en Alpine + pnpm isolated
RUN printf "node-linker=hoisted\n" > .npmrc
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @proptech/shared build
RUN pnpm --filter @proptech/server build

FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN printf "node-linker=hoisted\n" > .npmrc
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile --prod --filter @proptech/server...

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

WORKDIR /app/apps/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
