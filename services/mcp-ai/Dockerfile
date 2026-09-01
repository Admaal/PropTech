FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/mcp-ai ./services/mcp-ai

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @proptech/shared build
RUN pnpm --filter @proptech/mcp-ai build
RUN pnpm deploy --filter @proptech/mcp-ai --prod --legacy /app/deploy/mcp-ai

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/deploy/mcp-ai ./

USER nextjs
EXPOSE 3002
CMD ["node", "dist/index.js"]
