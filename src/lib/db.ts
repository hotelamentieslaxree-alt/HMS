import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitialized: boolean | undefined
}

// ─── PrismaClient factory ───────────────────────────────────────────────────
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
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

// ─── ensureDbReady ──────────────────────────────────────────────────────────
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  getOrCreateClient()
  globalForPrisma._dbInitialized = true
}
