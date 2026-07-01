FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
RUN printf "node-linker=hoisted\n" > .npmrc
COPY packages/shared ./packages/shared
COPY services/mcp-ai ./services/mcp-ai

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @proptech/shared build
RUN pnpm --filter @proptech/mcp-ai build

FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN printf "node-linker=hoisted\n" > .npmrc
COPY packages/shared/package.json ./packages/shared/
COPY services/mcp-ai/package.json ./services/mcp-ai/

RUN pnpm install --frozen-lockfile --prod --filter @proptech/mcp-ai...

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/mcp-ai/dist ./services/mcp-ai/dist

WORKDIR /app/services/mcp-ai
EXPOSE 3002
CMD ["node", "dist/index.js"]
