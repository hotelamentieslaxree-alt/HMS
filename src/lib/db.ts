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
 * On Vercel serverless, each cold start gets a fresh /tmp filesystem.
 * Strategy: Download the seed database (pre-built with schema + no data)
 * from the app's own static assets, copy to /tmp, then let auto-seeding
 * populate the demo data.
 */
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  if (process.env.TURSO_DATABASE_URL) return // Turso is persistent
  if (!process.env.VERCEL) return // Local dev — file persists

  const dbPath = '/tmp/hms.db'

  // Quick check if tables already exist (warm invocation)
  try {
    await db.property.findFirst()
    globalForPrisma._dbInitialized = true
    return
  } catch {
    // Tables don't exist — need to set up
  }

  try {
    // Download the seed DB from our own static hosting
    // The build script puts the seed DB at public/hms-seed.db
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://my-project-steel-omega.vercel.app'
    
    const response = await fetch(`${baseUrl}/hms-seed.db`)
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer())
      fs.writeFileSync(dbPath, buffer)
      console.log('[DB] Downloaded seed DB:', buffer.length, 'bytes')
    } else {
      console.error('[DB] Failed to download seed DB:', response.status)
      // Fallback: try to find it in the bundled files
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'hms-seed.db'),
        path.join(process.cwd(), '.next', 'server', 'public', 'hms-seed.db'),
      ]
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          fs.copyFileSync(p, dbPath)
          console.log('[DB] Copied seed DB from', p)
          break
        }
      }
    }
    
    // Re-create PrismaClient pointing to the now-existing DB
    const { PrismaClient } = require('@prisma/client')
    if (globalForPrisma.prisma) {
      try { await globalForPrisma.prisma.$disconnect() } catch {}
    }
    globalForPrisma.prisma = new PrismaClient({ log: ['error', 'warn'] })
    
    // Verify it works
    await db.property.findFirst()
    console.log('[DB] Database ready')
  } catch (e: any) {
    console.error('[DB] Setup failed:', e.message?.slice(0, 300))
  }

  globalForPrisma._dbInitialized = true
}
