#!/bin/sh
set -e

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

cd /app

# Try to sync database schema (only creates tables if they don't exist)
echo "🔍 Checking and syncing database schema..."

# Use prisma db push - it's idempotent and won't delete data if schema matches
if npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate 2>&1; then
  echo "✅ Database schema is up to date!"
else
  echo "⚠️ Schema sync had issues, but continuing to start the server..."
  echo "💡 You may need to manually run: docker compose exec subcare-api npx prisma db push"
fi

# Start the application
echo "🚀 Starting API server..."
exec node apps/api/dist/index.js
