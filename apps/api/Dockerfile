FROM node:20-alpine AS base

# 1. Prune dependencies
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
COPY . .
RUN npx turbo prune --scope=@subcare/api --docker

# 2. Install dependencies and build
FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# First install the dependencies
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Copy source code
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/turbo.json ./turbo.json
COPY .gitignore .gitignore

# Generate Prisma Client (CRITICAL for API)
RUN pnpm db:generate

# Build the project (force clean build)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN rm -rf apps/api/dist && pnpm turbo run build --filter=@subcare/api... --force

# 3. Production runner
FROM base AS runner
WORKDIR /app

# Install required packages:
# - netcat-openbsd: for database readiness check
# - mysql-client: for schema check
# - openssl: required by Prisma
# - libc6-compat: required for Node.js native modules
RUN apk add --no-cache netcat-openbsd mysql-client openssl libc6-compat

# Copy necessary files
COPY --from=installer /app .

# Copy and set entrypoint script
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3001
CMD ["/docker-entrypoint.sh"]
