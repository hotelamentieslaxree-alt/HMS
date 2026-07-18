#!/usr/bin/env bash
# setup-db.sh — Set up PostgreSQL database for ARIA HMS
# This script guides you through creating a free PostgreSQL database

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ARIA HMS — PostgreSQL Database Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "SQLite doesn't work on Vercel (no persistent filesystem)."
echo "We need PostgreSQL for both local dev and Vercel deployment."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OPTION 1: Neon (Recommended — Free Tier)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://console.neon.tech/signup"
echo "2. Sign up with GitHub or Google (FREE - 0.5GB storage, 100 compute hours/month)"
echo "3. Create a new project:"
echo "   - Name: hms-aurelian"
echo "   - Region: AWS Asia Pacific (Mumbai) ap-south-1"
echo "   - PostgreSQL 16"
echo "4. After project is created, copy the connection string from the Dashboard"
echo "   It looks like: postgres://neondb_owner:xxxx@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OPTION 2: Vercel Postgres (If already on Vercel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://vercel.com/dashboard"
echo "2. Open your project → Storage tab → Create Database → Postgres"
echo "3. After creating, go to the .env.local tab"
echo "4. Copy the POSTGRES_URL value (looks like: postgres://default:xxxx@ep-xxx.neon.tech/verceldb?sslmode=require)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  After getting the connection string:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Update .env file:"
echo "   DATABASE_URL=postgres://your-connection-string-here"
echo ""
echo "2. Push the schema:"
echo "   npx prisma db push"
echo ""
echo "3. Seed the demo data:"
echo "   bun run scripts/seed.ts"
echo ""
echo "4. For Vercel deployment, add the same DATABASE_URL to:"
echo "   Vercel Dashboard → Settings → Environment Variables"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# If a connection string was passed as argument, auto-configure
if [ -n "$1" ]; then
  CONN_STRING="$1"
  echo "🔑 Connection string provided, auto-configuring..."
  
  # Update .env
  echo "DATABASE_URL=$CONN_STRING" > .env
  echo "✅ .env updated with PostgreSQL connection string"
  
  # Push schema
  echo "📦 Pushing Prisma schema to database..."
  npx prisma db push --accept-data-loss
  echo "✅ Schema pushed!"
  
  # Seed
  echo "🌱 Seeding demo data..."
  bun run scripts/seed.ts
  echo "✅ Demo data seeded!"
  
  echo ""
  echo "🎉 Database setup complete! Run 'bun run dev' to start."
fi
