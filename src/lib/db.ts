import { PrismaClient } from '@prisma/client'
import fs from 'fs'

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

/** Replace the active database client (used after seed DB download on Vercel) */
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

  // Vercel: deduplicate
  if (_ensureDbPromise) {
    await _ensureDbPromise
    return
  }

  _ensureDbPromise = _downloadSeedDb()
  try {
    await _ensureDbPromise
  } finally {
    if (!globalForPrisma._dbInitialized) _ensureDbPromise = null
  }
}

async function _downloadSeedDb() {
  // If file already exists with valid data, just reconnect and verify
  if (fs.existsSync('/tmp/hms.db')) {
    try {
      const stat = fs.statSync('/tmp/hms.db')
      if (stat.size > 10000) {
        const client = createPrismaClient()
        try {
          await client.property.findFirst()
          replaceDbClient(client)
          globalForPrisma._dbInitialized = true
          console.log('[DB] Warm start — reusing /tmp/hms.db')
          return
        } catch {
          try { client.$disconnect(); } catch {}
        }
      }
    } catch { /* fall through */ }
    // Stale/corrupt file — remove it
    try { fs.unlinkSync('/tmp/hms.db'); } catch {}
  }

  // Download seed DB — try multiple URL sources
  const urls = [
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/hms-seed.db` : null,
    'https://chandracycle.vercel.app/hms-seed.db',
  ].filter(Boolean) as string[]

  for (const url of urls) {
    try {
      console.log('[DB] Downloading seed DB from', url)
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!response.ok) {
        console.warn('[DB] HTTP', response.status, 'from', url)
        continue
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 10000) {
        console.warn('[DB] File too small:', buffer.length, 'bytes from', url)
        continue
      }
      fs.writeFileSync('/tmp/hms.db', buffer)
      console.log('[DB] Downloaded:', buffer.length, 'bytes')

      const client = createPrismaClient()
      try {
        await client.property.findFirst()
        replaceDbClient(client)
        globalForPrisma._dbInitialized = true
        console.log('[DB] Ready ✓')
        return
      } catch (verifyErr: any) {
        console.error('[DB] Verify failed:', verifyErr.message?.slice(0, 200))
        try { client.$disconnect(); } catch {}
      }
    } catch (e: any) {
      console.warn('[DB] Download error from', url, ':', e.message?.slice(0, 150))
    }
  }

  console.error('[DB] All download attempts failed')
}
