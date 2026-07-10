import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitialized: boolean | undefined
}

// ─── Vercel compatibility: redirect DATABASE_URL to writable /tmp ────────────
// On Vercel serverless, the filesystem is read-only except for /tmp.
// We must set DATABASE_URL BEFORE PrismaClient is instantiated so that
// the SQLite engine opens /tmp/hms.db instead of the repo path.
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  process.env.DATABASE_URL = 'file:/tmp/hms.db'
}

// ─── PrismaClient factory ───────────────────────────────────────────────────
function createPrismaClient(): PrismaClient {
  // Turso/libSQL adapter for cloud database (Vercel or any environment)
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
// If the global client doesn't have expected models (schema mismatch), reset it
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).companyEvent) {
  try { globalForPrisma.prisma?.$disconnect(); } catch {}
  globalForPrisma.prisma = undefined as any
}

// ─── Singleton PrismaClient with reconnection support ───────────────────────
// We use a mutable reference + getter so that after downloading the seed DB
// on Vercel and reconnecting, all consumers get the new client.
let _activeClient: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _activeClient

/** Get the currently active PrismaClient */
function getDb(): PrismaClient {
  return _activeClient
}

/** Replace the active database client (used after seed DB download on Vercel) */
function replaceDbClient(newClient: PrismaClient) {
  try { _activeClient.$disconnect(); } catch {}
  _activeClient = newClient
  globalForPrisma.prisma = newClient
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = newClient
}

// Export `db` as a Proxy so that `db.model.findMany()` always goes through
// the current _activeClient, even after reconnection.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getDb()
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
  // Already initialized in this invocation
  if (globalForPrisma._dbInitialized) return

  // Turso is a persistent cloud database — no local file setup needed
  if (process.env.TURSO_DATABASE_URL) {
    globalForPrisma._dbInitialized = true
    return
  }

  // Local dev — file persists on disk, nothing to do
  if (!process.env.VERCEL) {
    globalForPrisma._dbInitialized = true
    return
  }

  // On Vercel: ensure exactly one setup attempt runs concurrently
  if (_ensureDbPromise) {
    await _ensureDbPromise
    return
  }

  _ensureDbPromise = _ensureDbReadyInner()
  try {
    await _ensureDbPromise
  } finally {
    // Allow retry on next invocation if setup failed
    if (!globalForPrisma._dbInitialized) {
      _ensureDbPromise = null
    }
  }
}

async function _ensureDbReadyInner() {
  // Quick check: if tables already exist, DB is ready (warm start)
  try {
    await _activeClient.property.findFirst()
    globalForPrisma._dbInitialized = true
    return
  } catch {
    // Tables don't exist — need to set up the DB
  }

  // Check if /tmp/hms.db already exists (maybe from a parallel invocation)
  if (fs.existsSync('/tmp/hms.db')) {
    try {
      const stat = fs.statSync('/tmp/hms.db')
      if (stat.size > 1000) {
        // File exists and has content — try to use it
        const newClient = createPrismaClient()
        replaceDbClient(newClient)
        try {
          await _activeClient.property.findFirst()
          globalForPrisma._dbInitialized = true
          return
        } catch {
          // File is corrupt or empty schema — fall through to download
        }
      }
    } catch {
      // fall through
    }
  }

  // Download the seed DB from our own static hosting
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL
        ? process.env.NEXT_PUBLIC_SITE_URL
        : null

    if (!baseUrl) {
      console.error('[DB] No VERCEL_URL or NEXT_PUBLIC_SITE_URL — cannot download seed DB')
      return
    }

    // Try /hms-seed.db first (static asset), then /api/seed-db (API route)
    const urls = [
      `${baseUrl}/hms-seed.db`,
      `${baseUrl}/api/seed-db`,
    ]

    let downloaded = false
    for (const url of urls) {
      try {
        console.log('[DB] Downloading seed DB from', url)
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          if (buffer.length > 1000) {
            fs.writeFileSync('/tmp/hms.db', buffer)
            console.log('[DB] Downloaded seed DB:', buffer.length, 'bytes')
            downloaded = true
            break
          } else {
            console.warn('[DB] Seed DB too small from', url, ':', buffer.length, 'bytes')
          }
        }
      } catch (fetchErr: any) {
        console.warn('[DB] Failed to fetch from', url, ':', fetchErr.message?.slice(0, 200))
      }
    }

    if (downloaded) {
      // DATABASE_URL already points to file:/tmp/hms.db (set at module load time)
      // Create a new PrismaClient that will open /tmp/hms.db
      const newClient = createPrismaClient()
      replaceDbClient(newClient)

      // Verify the database works
      try {
        await _activeClient.property.findFirst()
        globalForPrisma._dbInitialized = true
        console.log('[DB] Database ready after seed download')
      } catch (verifyErr: any) {
        console.error('[DB] Verification failed after download:', verifyErr.message?.slice(0, 300))
      }
    } else {
      console.error('[DB] Could not download seed DB from any source')
    }
  } catch (e: any) {
    console.error('[DB] Setup failed:', e.message?.slice(0, 300))
  }
}
