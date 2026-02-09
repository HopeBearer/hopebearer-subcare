#!/bin/sh
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          SubCare API - Container Entrypoint                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo "🔄 Waiting for database to be ready..."

# Wait for MySQL to be ready (max 60 seconds)
for i in $(seq 1 60); do
  if nc -z mysql 3306 2>/dev/null; then
    echo "✅ Database is ready!"
    break
  fi
  echo "⏳ Waiting for database... ($i/60)"
  sleep 1
done

# If still not ready after 60s, warn but continue
if ! nc -z mysql 3306 2>/dev/null; then
  echo "⚠️ Database may not be fully ready, attempting to proceed..."
fi

cd /app

# ===================================================================
# Step 1: Sync Database Schema (idempotent)
# ===================================================================
echo ""
echo "🔍 [1/4] Checking and syncing database schema..."

if npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate 2>&1; then
  echo "✅ Database schema is up to date!"
else
  echo "⚠️ Schema sync had issues, but continuing to start the server..."
  echo "💡 You may need to manually run: docker compose exec subcare-api npx prisma db push"
fi

# ===================================================================
# Step 2: Seed AI Providers & Models (idempotent - upsert based)
# ===================================================================
echo ""
echo "🌱 [2/4] Syncing AI providers and models data..."

if npx tsx apps/api/scripts/seed-ai-providers.ts 2>&1; then
  echo "✅ AI providers and models synced!"
else
  echo "⚠️ AI providers seed had issues, but continuing..."
  echo "💡 Manual: docker compose exec subcare-api npx tsx apps/api/scripts/seed-ai-providers.ts"
fi

# ===================================================================
# Step 3: Seed System Categories (idempotent - upsert based)
# ===================================================================
echo ""
echo "🏷️ [3/4] Syncing system categories..."

if npx tsx apps/api/scripts/seed-categories.ts 2>&1; then
  echo "✅ System categories synced!"
else
  echo "⚠️ Categories seed had issues, but continuing..."
  echo "💡 Manual: docker compose exec subcare-api npx tsx apps/api/scripts/seed-categories.ts"
fi

# ===================================================================
# Step 4: Seed Subscription Templates (idempotent - upsert based)
# ===================================================================
echo ""
echo "📋 [4/4] Syncing subscription templates..."

if npx tsx apps/api/scripts/seed-templates.ts 2>&1; then
  echo "✅ Subscription templates synced!"
else
  echo "⚠️ Templates seed had issues, but continuing..."
  echo "💡 Manual: docker compose exec subcare-api npx tsx apps/api/scripts/seed-templates.ts"
fi

# ===================================================================
# Start the Application
# ===================================================================
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🚀 Starting API server..."
echo "════════════════════════════════════════════════════════════════"
exec node apps/api/dist/index.js
