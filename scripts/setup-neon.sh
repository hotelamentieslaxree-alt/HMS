#!/usr/bin/env bash
# setup-neon.sh — Create a free Neon PostgreSQL database for the HMS app
# Run this script once to set up the cloud database

set -e

echo "🚀 Setting up Neon PostgreSQL database for ARIA HMS..."
echo ""
echo "Option 1: Create via Neon Console (Recommended)"
echo "  1. Go to https://console.neon.tech/signup"
echo "  2. Sign up with GitHub/Google"
echo "  3. Create a new project named 'hms-aurelian'"
echo "  4. Select region closest to you"
echo "  5. Copy the connection string (looks like: postgres://neondb_owner:xxxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require)"
echo ""
echo "Option 2: Create via Neon CLI"
echo "  1. Run: npx neonctl auth"
echo "  2. Run: npx neonctl projects create --name hms-aurelian"
echo "  3. Copy the connection string from output"
echo ""
echo "After getting the connection string:"
echo "  1. Update .env file: DATABASE_URL=postgres://neondb_owner:xxxx@ep-xxx.neon.tech/neondb?sslmode=require"
echo "  2. Run: npx prisma db push"
echo "  3. Run: bun run seed"
echo ""
echo "For Vercel deployment:"
echo "  1. Go to Vercel Dashboard → Settings → Environment Variables"
echo "  2. Add DATABASE_URL with the same PostgreSQL connection string"
echo "  3. Redeploy"
echo ""

# If NEON_API_KEY is set, create the project automatically
if [ -n "$NEON_API_KEY" ]; then
  echo "🔑 NEON_API_KEY detected, creating project automatically..."
  
  RESPONSE=$(curl -s -X POST "https://console.neon.tech/api/v2/projects" \
    -H "Authorization: Bearer $NEON_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"name":"hms-aurelian","regionId":"aws-ap-south-1"}')
  
  PROJECT_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin).get('project',{}).get('id',''))" 2>/dev/null)
  
  if [ -z "$PROJECT_ID" ]; then
    echo "❌ Failed to create project. Response: $RESPONSE"
    exit 1
  fi
  
  echo "✅ Project created: $PROJECT_ID"
  
  # Get connection string
  CONN_RESPONSE=$(curl -s "https://console.neon.tech/api/v2/projects/$PROJECT_ID/connection_uri" \
    -H "Authorization: Bearer $NEON_API_KEY")
  
  CONN_STRING=$(echo $CONN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin).get('uri',''))" 2>/dev/null)
  
  if [ -z "$CONN_STRING" ]; then
    echo "❌ Failed to get connection string"
    exit 1
  fi
  
  echo "✅ Connection string: $CONN_STRING"
  echo ""
  echo "Updating .env file..."
  echo "DATABASE_URL=$CONN_STRING" > .env
  echo "✅ .env updated!"
  echo ""
  echo "Pushing schema to database..."
  npx prisma db push --accept-data-loss
  echo "✅ Schema pushed!"
fi
