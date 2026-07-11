import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { execSync } from 'child_process'

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
 * Vercel cold-start strategy (NO external download):
 *
 * 1. Check if /tmp/hms.db already exists with valid data → warm start
 * 2. If not, run `prisma db push` which creates /tmp/hms.db with all tables
 * 3. Then ensureProperty() → seedDemoData() in hms.ts fills in demo rows
 *
 * This is 100% self-contained — zero dependency on any external URL.
 */
async function _initVercelDb() {
  // ─── Warm start: reuse existing valid DB ──────────────────────────────────
  if (fs.existsSync('/tmp/hms.db')) {
    try {
      const stat = fs.statSync('/tmp/hms.db')
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
    try { fs.unlinkSync('/tmp/hms.db'); } catch {}
  }

  // ─── Cold start: create fresh DB with schema ──────────────────────────────
  console.log('[DB] Cold start — pushing schema to /tmp/hms.db')
  try {
    // prisma db push creates the SQLite file + all tables
    execSync('npx prisma db push --skip-generate', {
      stdio: 'pipe',
      timeout: 30_000,
      env: { ...process.env, DATABASE_URL: 'file:/tmp/hms.db' },
    })
    console.log('[DB] Schema push complete')
  } catch (e: any) {
    console.error('[DB] Schema push failed:', e.message?.slice(0, 300))
    // Fallback: try creating client anyway — might work if schema already exists
  }

  // Create PrismaClient and verify
  const client = createPrismaClient()
  try {
    await client.property.findFirst()
    replaceDbClient(client)
    globalForPrisma._dbInitialized = true
    console.log('[DB] Ready ✓')
  } catch (verifyErr: any) {
    console.error('[DB] Verify failed after schema push:', verifyErr.message?.slice(0, 300))
    // Last resort: still set client so app doesn't completely crash
    replaceDbClient(client)
    globalForPrisma._dbInitialized = true
  }
}
