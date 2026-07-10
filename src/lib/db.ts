import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbInitialized: boolean | undefined
}

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || 'file:./db/custom.db'
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
 * This function copies the seed database (built at deploy time) to /tmp,
 * then the auto-seeding in PROPERTY_ID() populates demo data.
 */
export async function ensureDbReady() {
  if (globalForPrisma._dbInitialized) return
  if (process.env.TURSO_DATABASE_URL) return // Turso is persistent
  if (!process.env.VERCEL) return // Local dev — file persists

  // On Vercel: check if /tmp/hms.db exists with tables
  const dbPath = '/tmp/hms.db'
  try {
    // Quick check if tables already exist (warm start)
    await db.user.findFirst()
    globalForPrisma._dbInitialized = true
    return
  } catch {
    // Tables don't exist — need to set up the DB
  }

  // Copy the seed database from the bundled build artifact
  // The build script copies /tmp/hms.db to public/hms-seed.db
  // which gets bundled as a static asset accessible at build time
  try {
    // Try to find the seed DB in the serverless function bundle
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'hms-seed.db'),
      path.join(process.cwd(), '.next', 'static', 'hms-seed.db'),
      path.join(process.cwd(), 'hms-seed.db'),
    ]

    let seedFound = false
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, dbPath)
        seedFound = true
        console.log('[DB] Copied seed DB from', p)
        break
      }
    }

    if (!seedFound) {
      // No seed DB found — run prisma db push via internal API
      console.log('[DB] No seed DB found, creating schema from scratch...')
      // Use Prisma's internal schema push by executing raw SQL
      // Create the essential tables needed for the app to work
      const createTablesSQL = getCreateTablesSQL()
      for (const sql of createTablesSQL) {
        try {
          await db.$executeRawUnsafe(sql)
        } catch (e: any) {
          // Table may already exist from a previous attempt
          if (!e.message?.includes('already exists')) {
            console.error('[DB] Error creating table:', e.message?.slice(0, 100))
          }
        }
      }
    }

    // Verify tables exist
    await db.user.findFirst()
    console.log('[DB] Database ready')
    globalForPrisma._dbInitialized = true
  } catch (e: any) {
    console.error('[DB] Failed to initialize:', e.message?.slice(0, 200))
    globalForPrisma._dbInitialized = true // Don't retry on every request
  }
}

/** Minimal SQL to create essential tables for the HMS app */
function getCreateTablesSQL(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS Property (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      country TEXT NOT NULL DEFAULT 'India',
      timezone TEXT NOT NULL DEFAULT 'Asia/Calcutta',
      currency TEXT NOT NULL DEFAULT 'INR',
      starRating INTEGER NOT NULL DEFAULT 5,
      totalRooms INTEGER NOT NULL DEFAULT 0,
      checkInTime TEXT NOT NULL DEFAULT '14:00',
      checkOutTime TEXT NOT NULL DEFAULT '12:00',
      gstNumber TEXT,
      taxId TEXT,
      logoUrl TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      businessDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS RoomCategory (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      baseRate REAL NOT NULL,
      maxOccupancy INTEGER NOT NULL DEFAULT 2,
      amenities TEXT,
      roomCount INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Room (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      roomCategoryId TEXT NOT NULL,
      number TEXT NOT NULL,
      floor INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      rate REAL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT,
      email TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'receptionist',
      department TEXT,
      phone TEXT,
      avatarUrl TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      lastLogin DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Reservation (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      confirmationNumber TEXT NOT NULL,
      guestName TEXT NOT NULL,
      guestEmail TEXT,
      guestPhone TEXT,
      roomId TEXT,
      roomCategoryId TEXT,
      checkIn DATETIME NOT NULL,
      checkOut DATETIME NOT NULL,
      adults INTEGER NOT NULL DEFAULT 1,
      children INTEGER NOT NULL DEFAULT 0,
      rate REAL,
      ratePlanCode TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      source TEXT,
      specialRequests TEXT,
      folioId TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Department (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      headRole TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS RatePlan (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      roomCategoryId TEXT,
      baseRate REAL NOT NULL,
      mealPlan TEXT NOT NULL DEFAULT 'EP',
      season TEXT NOT NULL DEFAULT 'default',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT,
      userId TEXT,
      userRole TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      oldValue TEXT,
      newValue TEXT,
      ipAddress TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      userId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assignedTo TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      dueDate DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Folio (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      folioNumber TEXT NOT NULL,
      reservationId TEXT,
      guestName TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      totalAmount REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Payment (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      folioId TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      reference TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS HousekeepingTask (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      roomId TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assignedTo TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      checklist TEXT,
      notes TEXT,
      completedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Outlet (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'restaurant',
      status TEXT NOT NULL DEFAULT 'active',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS PosOrder (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      outletId TEXT NOT NULL,
      kotNumber INTEGER,
      tableNumber TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      total REAL NOT NULL DEFAULT 0,
      createdBy TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Guest (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      preferences TEXT,
      vipStatus TEXT NOT NULL DEFAULT 'regular',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS MaintenanceTicket (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      roomId TEXT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      assignedTo TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Attendance (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      userId TEXT,
      date DATETIME NOT NULL,
      checkIn DATETIME,
      checkOut DATETIME,
      status TEXT NOT NULL DEFAULT 'present',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS PayrollRecord (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      userId TEXT NOT NULL,
      month TEXT NOT NULL,
      basicSalary REAL NOT NULL,
      hra REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      netPay REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Scorecard (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      userId TEXT NOT NULL,
      period TEXT NOT NULL,
      metrics TEXT,
      rating REAL NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ShiftHandover (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      shift TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Invoice (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      invoiceNumber TEXT NOT NULL,
      folioId TEXT,
      toName TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid',
      dueDate DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Lead (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      company TEXT NOT NULL,
      contactName TEXT,
      email TEXT,
      phone TEXT,
      value REAL NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'lead',
      source TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Deal (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      leadId TEXT,
      title TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'proposal',
      probability REAL NOT NULL DEFAULT 0.5,
      closeDate DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Campaign (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      budget REAL NOT NULL DEFAULT 0,
      startDate DATETIME,
      endDate DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS SocialAccount (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      followers INTEGER NOT NULL DEFAULT 0,
      accessToken TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS HospitalPatient (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      address TEXT,
      diagnosis TEXT,
      status TEXT NOT NULL DEFAULT 'admitted',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS HospitalDoctor (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      schedule TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS HospitalAppointment (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      doctorId TEXT NOT NULL,
      date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Vendor (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      contactPerson TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS StockItem (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'unit',
      quantity REAL NOT NULL DEFAULT 0,
      reorderLevel REAL NOT NULL DEFAULT 10,
      unitPrice REAL NOT NULL DEFAULT 0,
      vendorId TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS MenuCategory (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      outletId TEXT NOT NULL,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS MenuItem (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      menuCategoryId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      isVeg INTEGER NOT NULL DEFAULT 1,
      isAvailable INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Event (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      propertyId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date DATETIME NOT NULL,
      type TEXT NOT NULL DEFAULT 'event',
      status TEXT NOT NULL DEFAULT 'upcoming',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ]
}
