#!/usr/bin/env bash
# switch-schema.sh — Switch Prisma schema between SQLite and PostgreSQL
# Called automatically during prisma generate / db push

set -e

SCHEMA_DIR="$(cd "$(dirname "$0")/.." && pwd)/prisma"
URL="${DATABASE_URL:-}"

if echo "$URL" | grep -q "^postgres"; then
  echo "🔀 Detected PostgreSQL DATABASE_URL — using schema.postgresql.prisma"
  cp "$SCHEMA_DIR/schema.postgresql.prisma" "$SCHEMA_DIR/schema.prisma"
else
  echo "🔀 Detected SQLite/empty DATABASE_URL — using schema.sqlite.prisma"
  cp "$SCHEMA_DIR/schema.sqlite.prisma" "$SCHEMA_DIR/schema.prisma"
fi
