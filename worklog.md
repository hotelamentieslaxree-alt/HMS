# ARIA HMS — Worklog

---
Task ID: 1
Agent: Main
Task: Fix white blank page issue in ARIA HMS

Work Log:
- Diagnosed blank page: `useState` was used but not imported in `app-shell.tsx` line 117
- Found root cause of server crashes: OOM (Out of Memory) killer terminating Next.js server
  - 29 module components were eagerly imported, causing Turbopack to compile 2.6GB+ at once
  - The 4GB sandbox couldn't handle dev server + browser + Prisma simultaneously
- Applied fix 1: Added `useState` to React imports in `app-shell.tsx`
- Applied fix 2: Converted all 29 module imports to `React.lazy()` with dynamic imports
- Applied fix 3: Lazy-loaded shell components (Sidebar, Topbar, LoginPage, CommandPalette, RealtimeToasts) using `React.lazy()`
- Applied fix 4: Made `page.tsx` use `dynamic()` with `ssr: false` and a loading skeleton
- Applied fix 5: Added `NODE_OPTIONS="--max-old-space-size=1024"` to limit V8 heap and prevent OOM
- Added `allowedDevOrigins` to `next.config.ts` for cross-origin preview panel access
- Removed `output: "standalone"` from `next.config.ts` as it was causing issues with `next start`
- Added `dev:prod` script to `package.json` for running production server
- Verified: page returns HTTP 200 with login content, login API works
- Note: Browser-based verification causes OOM due to Chrome + Next.js combined memory usage exceeding 4GB sandbox limit

Stage Summary:
- Key fix: Missing `useState` import caused ReferenceError → blank page
- Key fix: Eager module imports caused 2.6GB+ compilation memory → OOM → server crash → blank page
- Key fix: Lazy loading with `React.lazy()` reduced per-module memory from 2.6GB to ~300MB
- Key fix: `NODE_OPTIONS="--max-old-space-size=1024"` prevents Node.js from exceeding available RAM
- Production server runs at ~670MB memory, handles page + API requests successfully
- Browser verification limited by 4GB sandbox constraint (Chrome + server = ~1.4GB+ before requests)

---
Task ID: 2
Agent: DB-Layer-Fix
Task: Fix database layer for Vercel (serverless) + local dev (SQLite) dual-mode

Work Log:
- Read current `src/lib/db.ts` — simple PrismaClient with SQLite file, no Vercel awareness
- Read `.env` — only had `DATABASE_URL=file:/home/z/my-project/db/custom.db`
- Confirmed `@prisma/adapter-libsql` (v7.8.0) and `@libsql/client` (v0.17.4) already in package.json
- Rewrote `src/lib/db.ts`:
  - Added imports for `PrismaLibSQL` adapter and `createClient` from `@libsql/client`
  - Created `createPrismaClient()` factory function with environment detection
  - On Vercel (`process.env.VERCEL`) or when `TURSO_DATABASE_URL` is set: creates libSQL client + PrismaLibSQL adapter, routes queries to Turso remote DB
  - On local dev: falls back to existing SQLite file via PrismaClient defaults
  - Preserved global singleton caching and stale-client invalidation logic
- Updated `.env`: added commented-out `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` placeholders
- Did NOT modify `prisma/schema.prisma` — provider stays as `sqlite` (adapter pattern handles runtime routing)
- Smoke-tested: local SQLite query via PrismaClient succeeds

Stage Summary:
- `src/lib/db.ts` now auto-detects environment and routes DB queries accordingly
- Local dev: unchanged behavior (SQLite file)
- Vercel: uses Turso/libSQL remote database via PrismaLibSQL adapter
- Deployers need to set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars on Vercel
- No schema changes required

---
Task ID: 3
Agent: API-Fix
Task: Fix critical API errors for Vercel compatibility

Work Log:
- Fix 1: Added `if (process.env.VERCEL) return;` as first line inside `broadcast()` in `src/lib/hms.ts` — prevents attempting to call `http://localhost:3003` on Vercel where no local WS server exists
- Fix 3: Added `safeJsonParse<T>()` helper function to top of `src/lib/hms.ts` (after imports) — returns fallback on null/undefined/parse-error instead of throwing
- Fix 3: Replaced all `JSON.parse()` calls on DB fields across API routes with `safeJsonParse()`:
  - `src/app/api/rooms/route.ts` — `JSON.parse(r.category.amenities)` → `safeJsonParse(r.category.amenities, [])`
  - `src/app/api/audit-log/route.ts` — `JSON.parse(l.oldValue/newValue)` → `safeJsonParse(l.oldValue/newValue, {})`
  - `src/app/api/guests/route.ts` — `JSON.parse(g.preferences)` → `safeJsonParse(g.preferences, {})`
  - `src/app/api/guests/[id]/route.ts` — `JSON.parse(guest.preferences)` → `safeJsonParse(guest.preferences, {})`
  - `src/app/api/housekeeping/route.ts` — `JSON.parse(t.checklist)` → `safeJsonParse(t.checklist, [])`
- Fix 2: Replaced all `NextResponse.json()` calls in marketing routes with `ok()`/`fail()` helpers:
  - `src/app/api/marketing/social/route.ts` — `NextResponse.json({ success: true, data, ... })` → `ok(data, meta)`
  - `src/app/api/marketing/campaigns/route.ts` — same pattern → `ok(data, meta)`
  - `src/app/api/marketing/analytics/route.ts` — `NextResponse.json({ success: true, data })` → `ok(data)`
- Fix 4: Replaced all `await req.json()` calls in marketing routes with `await parseBody(req)`:
  - `src/app/api/marketing/social/route.ts` — POST handler
  - `src/app/api/marketing/campaigns/route.ts` — POST handler
- Removed unused `NextResponse` import from all 3 marketing route files
- Verified: no remaining `JSON.parse()` on DB fields, no remaining `NextResponse.json()`, no remaining `req.json()` in API routes (except auth/login which has its own try/catch and is acceptable)

Stage Summary:
- `broadcast()` no longer crashes on Vercel by skipping localhost fetch
- `safeJsonParse()` prevents 500 errors from malformed JSON in DB text fields
- All marketing routes now use consistent `ok()`/`fail()` response format
- All marketing routes use `parseBody()` for safe body parsing instead of raw `req.json()`
