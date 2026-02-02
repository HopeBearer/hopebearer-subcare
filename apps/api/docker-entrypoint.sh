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

# Check if users table exists (indicates database is already initialized)
echo "🔍 Checking database status..."

# Extract database connection info from DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -E 's/.*@([^:]+):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed -E 's/.*:([0-9]+)\/.*/\1/')
DB_NAME=$(echo $DATABASE_URL | sed -E 's/.*\/([^?]+).*/\1/')
DB_USER=$(echo $DATABASE_URL | sed -E 's/.*:\/\/([^:]+):.*/\1/')
DB_PASS=$(echo $DATABASE_URL | sed -E 's/.*:\/\/[^:]+:([^@]+)@.*/\1/')

# Check if users table exists
TABLE_EXISTS=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='users';" 2>/dev/null || echo "0")

if [ "$TABLE_EXISTS" = "0" ]; then
  echo "📦 Database is empty, initializing schema..."
  npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate
  echo "✅ Database schema initialized!"
else
  echo "✅ Database already initialized, skipping schema sync"
  echo "💡 To update schema manually, run: docker compose exec subcare-api npx prisma db push"
fi

# Start the application
echo "🚀 Starting API server..."
exec node apps/api/dist/index.js
