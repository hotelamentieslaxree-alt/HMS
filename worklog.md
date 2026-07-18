---
Task ID: 1
Agent: Main Agent
Task: Connect Neon PostgreSQL database to ARIA HMS for Vercel deployment

Work Log:
- Analyzed existing project structure: found dual-schema setup (SQLite for local, PostgreSQL for production)
- Verified `switch-schema.sh` auto-switches based on DATABASE_URL protocol
- Set DATABASE_URL to Neon PostgreSQL and pushed schema: `prisma db push --accept-data-loss`
- Ran seed script (`scripts/seed.ts`) to populate Neon database with demo data
- Ran HR seed script (`prisma/seed-hr.ts`) to populate HR data
- Updated Vercel environment variable: removed old DATABASE_URL, added new Neon PostgreSQL URL for production + preview
- Deployed to Vercel production — build succeeded, auto-detected PostgreSQL schema
- Verified Vercel login API: `owner@aurelian.com` / `aurelian2024` ✅
- Verified Vercel dashboard API: returns real data from Neon ✅
- Verified local dev (SQLite) still works: login + dashboard ✅
- Switched back to SQLite schema for local development

Stage Summary:
- Neon PostgreSQL database: `postgresql://neondb_owner:npg_i6j3wypOJkxV@ep-frosty-surf-atpd2957-pooler.c-9.us-east-1.aws.neon.tech/neondb`
- 18 users seeded, 26 rooms, full demo data
- Login credentials: `owner@aurelian.com` / `aurelian2024`
- Vercel production URL: https://hms-r8xb.vercel.app
- Local dev uses SQLite (`file:./db/custom.db`)
- Production uses Neon PostgreSQL via DATABASE_URL env var
- The `switch-schema.sh` script auto-detects database type and switches Prisma schema accordingly
