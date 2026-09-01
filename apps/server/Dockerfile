FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @proptech/shared build
RUN pnpm --filter @proptech/server build
RUN pnpm deploy --filter @proptech/server --prod --legacy /app/deploy/server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/deploy/server ./

USER nextjs
EXPOSE 3001
CMD ["node", "dist/index.js"]
