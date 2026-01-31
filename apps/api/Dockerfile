FROM node:18-alpine AS base

# 1. Prune dependencies
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
COPY . .
RUN npx turbo prune --scope=@subcare/api --docker

# 2. Install dependencies and build
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# First install the dependencies
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Copy source code
COPY --from=builder /app/out/full/ .
COPY .gitignore .gitignore

# Generate Prisma Client (CRITICAL for API)
RUN pnpm db:generate

# Build the project
RUN pnpm turbo run build --filter=@subcare/api...

# 3. Production runner
FROM base AS runner
WORKDIR /app

# Copy necessary files
COPY --from=installer /app .

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
