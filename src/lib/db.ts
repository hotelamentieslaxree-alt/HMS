import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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
 * We need to set up the database schema before queries can run.
 * 
 * Strategy: Run `prisma db push` at runtime using the CLI that's already
 * in node_modules. This creates all tables matching the Prisma schema
 * exactly, then the auto-seeding in PROPERTY_ID() populates demo data.
 */
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  if (process.env.TURSO_DATABASE_URL) return // Turso is persistent
  if (!process.env.VERCEL) return // Local dev — file persists

  // Quick check if tables already exist (warm invocation)
  try {
    await db.property.findFirst()
    globalForPrisma._dbInitialized = true
    return
  } catch {
    // Tables don't exist — need to set up
  }

  try {
    // Use the Prisma CLI binary directly from node_modules
    const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma')
    execSync(`"${prismaBin}" db push --accept-data-loss --skip-generate 2>&1`, {
      stdio: 'pipe',
      timeout: 30000,
      env: { ...process.env },
    })
    console.log('[DB] Schema pushed successfully')
  } catch (e: any) {
    const output = e.stdout?.toString() || e.stderr?.toString() || e.message || ''
    console.error('[DB] Schema push failed:', output.slice(0, 300))
  }

  globalForPrisma._dbInitialized = true
}
