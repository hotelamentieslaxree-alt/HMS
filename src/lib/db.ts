import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
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

  // Default: SQLite file (local dev) or Vercel without Turso
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
 * Ensure the database schema is ready on Vercel serverless.
 * Each cold start gets a fresh /tmp — we must push the schema
 * so the auto-seeding in PROPERTY_ID() can populate the data.
 */
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  if (process.env.TURSO_DATABASE_URL) return // Turso is a persistent cloud DB
  if (!process.env.VERCEL) return // Local dev — SQLite file persists

  // On Vercel serverless: each cold start has a fresh /tmp
  // Push schema to create tables, then auto-seed will populate data
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate 2>&1', {
      stdio: 'pipe',
      timeout: 30000,
    })
    console.log('[DB] Schema pushed to /tmp/hms.db')
  } catch (e: any) {
    // db push may fail if tables already exist (warm invocation) — that's OK
    const stderr = e.stderr?.toString() || ''
    if (!stderr.includes('already exists')) {
      console.error('[DB] Schema push warning:', stderr.slice(0, 200))
    }
  }
  globalForPrisma._dbInitialized = true
}
