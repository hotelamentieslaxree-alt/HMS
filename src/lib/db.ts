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
// On Vercel cold start: we DEFER PrismaClient creation until ensureDbReady()
// has downloaded the seed DB to /tmp/hms.db. This prevents Prisma from creating
// an empty file that would cause "file is not a database" errors.
let _activeClient: PrismaClient | null = null

function getOrCreateClient(): PrismaClient {
  if (!_activeClient) {
    _activeClient = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _activeClient
  }
  return _activeClient
}

/** Replace the active database client (used after seed DB download on Vercel) */
function replaceDbClient(newClient: PrismaClient) {
  if (_activeClient) {
    try { _activeClient.$disconnect(); } catch {}
  }
  _activeClient = newClient
  globalForPrisma.prisma = newClient
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = newClient
}

// Export `db` as a Proxy so that `db.model.findMany()` always goes through
// the current _activeClient, even after reconnection.
// On Vercel, the first property access triggers ensureDbReady() automatically
// via a thrown error if DB isn't ready yet. All API routes should call
// ensureDbReady() explicitly at the start.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    // Special properties that don't require a client
    if (prop === Symbol.dispose || prop === Symbol.asyncDispose || prop === 'then' || prop === 'toJSON') {
      return undefined
    }
    
    const client = _activeClient
    if (!client) {
      // On Vercel before ensureDbReady(): throw a clear error
      if (process.env.VERCEL && !globalForPrisma._dbInitialized) {
        throw new Error('[DB] PrismaClient not initialized — call ensureDbReady() before querying the database')
      }
      // Local dev / Turso: create on demand
      const newClient = getOrCreateClient()
      const value = (newClient as any)[prop]
      if (typeof value === 'function') return value.bind(newClient)
      return value
    }
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
    // Ensure client exists for Turso
    getOrCreateClient()
    return
  }

  // Local dev — file persists on disk, nothing special needed
  if (!process.env.VERCEL) {
    globalForPrisma._dbInitialized = true
    // Ensure client exists for local dev
    getOrCreateClient()
    return
  }

  // ─── Vercel serverless: download seed DB to /tmp/hms.db ─────────────────
  // Deduplicate concurrent calls
  if (_ensureDbPromise) {
    await _ensureDbPromise
    return
  }

  _ensureDbPromise = _ensureDbReadyInner()
  try {
    await _ensureDbPromise
  } finally {
    if (!globalForPrisma._dbInitialized) {
      _ensureDbPromise = null
    }
  }
}

async function _ensureDbReadyInner() {
  // Step 1: Check if /tmp/hms.db already exists with valid data (warm start)
  if (fs.existsSync('/tmp/hms.db')) {
    try {
      const stat = fs.statSync('/tmp/hms.db')
      if (stat.size > 10000) {
        // File exists with substantial content — create client and verify
        _activeClient = createPrismaClient()
        try {
          await _activeClient.property.findFirst()
          globalForPrisma._dbInitialized = true
          globalForPrisma.prisma = _activeClient
          console.log('[DB] Reusing existing /tmp/hms.db (warm start)')
          return
        } catch {
          // File is corrupt or empty schema — fall through to download
          try { _activeClient.$disconnect(); } catch {}
          _activeClient = null
        }
      }
    } catch {
      // fall through
    }
  }

  // Step 2: Download the seed DB from static hosting
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

    // Remove any stale empty file before download
    try { fs.unlinkSync('/tmp/hms.db'); } catch {}

    const url = `${baseUrl}/hms-seed.db`
    console.log('[DB] Downloading seed DB from', url)

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })

    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length > 10000) {
        fs.writeFileSync('/tmp/hms.db', buffer)
        console.log('[DB] Downloaded seed DB:', buffer.length, 'bytes')

        // Create PrismaClient AFTER the file is written
        _activeClient = createPrismaClient()
        globalForPrisma.prisma = _activeClient

        // Verify the database works
        try {
          await _activeClient.property.findFirst()
          globalForPrisma._dbInitialized = true
          console.log('[DB] Database ready after seed download')
          return
        } catch (verifyErr: any) {
          console.error('[DB] Verification failed after download:', verifyErr.message?.slice(0, 300))
          try { _activeClient.$disconnect(); } catch {}
          _activeClient = null
        }
      } else {
        console.warn('[DB] Seed DB too small:', buffer.length, 'bytes')
      }
    } else {
      console.error('[DB] Download failed:', response.status, await response.text().catch(() => '').slice(0, 200))
    }
  } catch (e: any) {
    console.error('[DB] Setup failed:', e.message?.slice(0, 300))
  }

  console.error('[DB] All setup attempts failed — database will not be available for this request')
  console.error('[DB] This may resolve on the next request (warm start will retry download)')

}
