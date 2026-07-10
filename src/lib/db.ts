import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitialized: boolean | undefined
}

function createPrismaClient(): PrismaClient {
  // On Vercel with Turso/libSQL configured: use the adapter
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
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

// Invalidate stale cached client
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).companyEvent) {
  try { globalForPrisma.prisma?.$disconnect(); } catch {}
  globalForPrisma.prisma = undefined as any;
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Reconnect PrismaClient to a different database file.
 * Used after downloading the seed DB to /tmp on Vercel.
 */
function reconnectPrismaClient() {
  if (globalForPrisma.prisma) {
    try { globalForPrisma.prisma.$disconnect(); } catch {}
  }
  // Force a new PrismaClient that will read the now-existing /tmp/hms.db
  globalForPrisma.prisma = new PrismaClient({ log: ['error', 'warn'] })
  // Replace the exported `db` — since it's a const, we use a getter pattern
  // Actually, we need to make `db` dynamic. Let's use a Proxy.
}

// Use a Proxy so that db calls always go through the current globalForPrisma.prisma
const dbProxy = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

// Override the const db export — we need to change the approach
// Actually, let's just make `db` a getter
// The simplest approach: re-export from a mutable reference

let _db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db

export { _db as db }

/** Replace the active database client (used after seed DB download) */
export function replaceDbClient(newClient: PrismaClient) {
  _db = newClient
  globalForPrisma.prisma = newClient
}

/**
 * On Vercel serverless, each cold start gets a fresh /tmp filesystem.
 * Strategy: Download the seed database (pre-built with schema) from
 * the app's own static assets, copy to /tmp/hms.db, then reconnect
 * PrismaClient. Auto-seeding will populate demo data after.
 */
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  if (process.env.TURSO_DATABASE_URL) return // Turso is persistent
  if (!process.env.VERCEL) return // Local dev — file persists

  // Quick check if tables already exist (warm invocation)
  try {
    await _db.property.findFirst()
    globalForPrisma._dbInitialized = true
    return
  } catch {
    // Tables don't exist — need to set up
  }

  try {
    // Download the seed DB from our own static hosting
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://my-project-steel-omega.vercel.app'
    
    console.log('[DB] Downloading seed DB from', `${baseUrl}/hms-seed.db`)
    const response = await fetch(`${baseUrl}/hms-seed.db`)
    
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      fs.writeFileSync('/tmp/hms.db', buffer)
      console.log('[DB] Downloaded seed DB:', buffer.length, 'bytes')
      
      // Reconnect PrismaClient to the now-existing /tmp/hms.db
      const newClient = new PrismaClient({ log: ['error', 'warn'] })
      replaceDbClient(newClient)
      
      // Verify it works
      await _db.property.findFirst()
      console.log('[DB] Database ready after seed download')
    } else {
      console.error('[DB] Failed to download seed DB:', response.status, await response.text().catch(() => ''))
    }
  } catch (e: any) {
    console.error('[DB] Setup failed:', e.message?.slice(0, 300))
  }

  globalForPrisma._dbInitialized = true
}
