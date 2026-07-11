import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { INIT_SQL } from '@/lib/init-sql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitialized: boolean | undefined
}

// ─── Vercel compatibility: redirect DATABASE_URL to writable /tmp ────────────
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/tmp/hms.db'
}

// ─── PrismaClient factory ───────────────────────────────────────────────────
function createPrismaClient(): PrismaClient {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter, log: ['error', 'warn'] })
  }
  return new PrismaClient({ log: ['error', 'warn'] })
}

// ─── Invalidate stale cached client ─────────────────────────────────────────
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).companyEvent) {
  try { globalForPrisma.prisma?.$disconnect(); } catch {}
  globalForPrisma.prisma = undefined as any
}

// ─── Singleton with lazy init ───────────────────────────────────────────────
let _activeClient: PrismaClient | null = null

function getOrCreateClient(): PrismaClient {
  if (!_activeClient) {
    _activeClient = globalForPrisma.prisma ?? createPrismaClient()
    globalForPrisma.prisma = _activeClient
  }
  return _activeClient
}

/** Replace the active database client (used after schema push on Vercel) */
function replaceDbClient(newClient: PrismaClient) {
  if (_activeClient) {
    try { _activeClient.$disconnect(); } catch {}
  }
  _activeClient = newClient
  globalForPrisma.prisma = newClient
}

// Export `db` as a Proxy — always routes through current _activeClient
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    if (prop === Symbol.dispose || prop === Symbol.asyncDispose || prop === 'then' || prop === 'toJSON') {
      return undefined
    }
    const client = _activeClient ?? getOrCreateClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// ─── ensureDbReady — Vercel serverless cold-start DB setup ──────────────────
let _ensureDbPromise: Promise<void> | null = null

export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return

  // Turso / local dev — no file setup needed
  if (process.env.TURSO_DATABASE_URL || !process.env.VERCEL) {
    globalForPrisma._dbInitialized = true
    getOrCreateClient()
    return
  }

  // Vercel: deduplicate concurrent calls
  if (_ensureDbPromise) {
    await _ensureDbPromise
    return
  }

  _ensureDbPromise = _initVercelDb()
  try {
    await _ensureDbPromise
  } finally {
    if (!globalForPrisma._dbInitialized) _ensureDbPromise = null
  }
}

/**
 * Vercel cold-start strategy:
 *
 * 1. Check if /tmp/hms.db already exists with valid data → warm start
 * 2. If not, create /tmp/hms.db and run CREATE TABLE IF NOT EXISTS for all tables
 * 3. Then ensureProperty() → seedDemoData() in hms.ts fills in demo rows
 *
 * Uses raw SQL (bundled at build time in init-sql.ts) instead of `npx prisma db push`
 * which doesn't work on Vercel serverless.
 */
async function _initVercelDb() {
  const dbPath = '/tmp/hms.db'

  // ─── Warm start: reuse existing valid DB ──────────────────────────────────
  if (fs.existsSync(dbPath)) {
    try {
      const stat = fs.statSync(dbPath)
      if (stat.size > 10000) {
        const client = createPrismaClient()
        try {
          await client.property.findFirst()
          replaceDbClient(client)
          globalForPrisma._dbInitialized = true
          console.log('[DB] Warm start — reusing /tmp/hms.db (' + stat.size + ' bytes)')
          return
        } catch {
          // DB file exists but tables missing or corrupt
          try { client.$disconnect(); } catch {}
        }
      }
    } catch { /* fall through */ }
    // Stale/corrupt file — remove it
    try { fs.unlinkSync(dbPath); } catch {}
  }

  // ─── Cold start: create fresh DB with raw SQL ─────────────────────────────
  console.log('[DB] Cold start — creating schema via raw SQL')

  // Ensure the SQLite file exists (Prisma needs it)
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, Buffer.alloc(0))
  }

  const client = createPrismaClient()

  try {
    // Use bundled SQL from init-sql.ts (always available in serverless bundle)
    let sql = INIT_SQL

    // Convert CREATE TABLE → CREATE TABLE IF NOT EXISTS for idempotency
    sql = sql.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "')
    // Convert CREATE UNIQUE INDEX → CREATE UNIQUE INDEX IF NOT EXISTS
    sql = sql.replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
    // Convert CREATE INDEX → CREATE INDEX IF NOT EXISTS
    sql = sql.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "')

    // Split into individual statements and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    for (const stmt of statements) {
      try {
        await client.$executeRawUnsafe(stmt)
        successCount++
      } catch (stmtErr: any) {
        const msg = stmtErr?.message || ''
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          // Table/index already exists — fine, idempotent
        } else {
          console.error('[DB] SQL error:', msg.slice(0, 200), '| stmt:', stmt.slice(0, 150))
        }
      }
    }

    console.log(`[DB] Created ${successCount}/${statements.length} tables/indexes`)

    // Verify the Property table works
    await client.property.findFirst()
    replaceDbClient(client)
    globalForPrisma._dbInitialized = true
    console.log('[DB] Ready ✓ — all tables created via raw SQL')
    return
  } catch (e: any) {
    console.error('[DB] Raw SQL init failed:', e.message?.slice(0, 300))
    try { client.$disconnect(); } catch {}
  }

  // ─── Fallback: try prisma db push (less reliable on serverless) ───────────
  console.log('[DB] Fallback: trying prisma db push')
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process')
    execSync('npx prisma db push --skip-generate', {
      stdio: 'pipe',
      timeout: 30_000,
      env: { ...process.env, DATABASE_URL: 'file:/tmp/hms.db' },
    })
    const client2 = createPrismaClient()
    await client2.property.findFirst()
    replaceDbClient(client2)
    globalForPrisma._dbInitialized = true
    console.log('[DB] Ready via fallback ✓')
    return
  } catch (fallbackErr: any) {
    console.error('[DB] Fallback also failed:', fallbackErr.message?.slice(0, 300))
  }

  // Last resort — still set initialized so app doesn't hang
  const lastClient = createPrismaClient()
  replaceDbClient(lastClient)
  globalForPrisma._dbInitialized = true
  console.log('[DB] Initialized with last-resort client (tables may be missing)')
}
