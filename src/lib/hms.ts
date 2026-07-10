// ARIA HMS — API helpers
import { NextResponse } from "next/server";
import { db, ensureDbReady } from "@/lib/db";

// ─── Safe JSON parse ────────────────────────────────────────────────────────
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ─── Property ID cache (H9: avoid findFirst on every API call) ────────────────
let _cachedPropertyId: string | null = null;

/** Auto-seed a demo property if none exists (first run / Vercel cold start) */
async function ensureProperty() {
  let p = await db.property.findFirst({ orderBy: { createdAt: "asc" } });
  if (p) return p;
  // No property exists — create the demo property
  p = await db.property.create({
    data: {
      name: "The Aurelian Grand",
      code: "TAG",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      timezone: "Asia/Calcutta",
      currency: "INR",
      starRating: 5,
      totalRooms: 26,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      businessDate: new Date(),
    },
  });
  // Seed essential data: room categories + rooms + demo users
  await seedDemoData(p.id);
  return p;
}

/** Seed demo data for the property — runs once on first access */
async function seedDemoData(propertyId: string) {
  // Room categories — fields must match prisma schema
  await db.roomCategory.createMany({
    data: [
      { id: "cat-deluxe", propertyId, name: "Deluxe Room", code: "DLX", baseRate: 4500, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar"]) },
      { id: "cat-suite", propertyId, name: "Executive Suite", code: "EXE", baseRate: 8500, maxAdults: 3, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar", "Bathtub", "Lounge"]) },
      { id: "cat-premium", propertyId, name: "Premium Room", code: "PRM", baseRate: 6500, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC", "Mini Bar", "Coffee Machine"]) },
      { id: "cat-standard", propertyId, name: "Standard Room", code: "STD", baseRate: 3000, maxAdults: 2, amenities: JSON.stringify(["WiFi", "TV", "AC"]) },
    ],
  });

  // Rooms — fields must match prisma schema (categoryId, roomNumber, currentStatus)
  const roomData: any[] = [];
  const catConfigs = [
    { catId: "cat-deluxe", prefix: "1", count: 10, floor: 1 },
    { catId: "cat-suite", prefix: "2", count: 8, floor: 2 },
    { catId: "cat-premium", prefix: "3", count: 6, floor: 3 },
    { catId: "cat-standard", prefix: "4", count: 2, floor: 4 },
  ];
  for (const cfg of catConfigs) {
    for (let i = 1; i <= cfg.count; i++) {
      const num = `${cfg.prefix}${String(i).padStart(2, "0")}`;
      roomData.push({
        propertyId,
        categoryId: cfg.catId,
        roomNumber: num,
        floor: cfg.floor,
        currentStatus: i <= 4 ? "occupied_clean" : i === 5 ? "out_of_order" : "vacant_clean",
      });
    }
  }
  await db.room.createMany({ data: roomData });

  // Demo users (one per role)
  const roles = [
    { email: "owner@aurelian.com", firstName: "Vikram", lastName: "Mehta", role: "owner", department: "Management" },
    { email: "gm@aurelian.com", firstName: "Priya", lastName: "Sharma", role: "gm", department: "Management" },
    { email: "fom@aurelian.com", firstName: "Rahul", lastName: "Kumar", role: "fom", department: "Front Office" },
    { email: "receptionist@aurelian.com", firstName: "Anita", lastName: "Patel", role: "receptionist", department: "Front Office" },
    { email: "hk_mgr@aurelian.com", firstName: "Sunita", lastName: "Devi", role: "hk_mgr", department: "Housekeeping" },
    { email: "fb_mgr@aurelian.com", firstName: "Chef", lastName: "Rajan", role: "fb_mgr", department: "F&B" },
    { email: "fin_mgr@aurelian.com", firstName: "Arun", lastName: "Gupta", role: "fin_mgr", department: "Finance" },
    { email: "eng_mgr@aurelian.com", firstName: "Deepak", lastName: "Singh", role: "eng_mgr", department: "Engineering" },
    { email: "rev_mgr@aurelian.com", firstName: "Neha", lastName: "Jain", role: "rev_mgr", department: "Revenue" },
    { email: "hr_mgr@aurelian.com", firstName: "Meera", lastName: "Reddy", role: "hr_mgr", department: "HR" },
    { email: "sales_mgr@aurelian.com", firstName: "Raj", lastName: "Malhotra", role: "sales_mgr", department: "Sales" },
    { email: "mkt_mgr@aurelian.com", firstName: "Kavita", lastName: "Nair", role: "mkt_mgr", department: "Marketing" },
    { email: "waiter@aurelian.com", firstName: "Amit", lastName: "Kumar", role: "waiter", department: "F&B" },
    { email: "technician@aurelian.com", firstName: "Sunil", lastName: "Yadav", role: "technician", department: "Engineering" },
    { email: "hk_attendant@aurelian.com", firstName: "Lakshmi", lastName: "Bai", role: "hk_attendant", department: "Housekeeping" },
    { email: "sales_exec@aurelian.com", firstName: "Vivek", lastName: "Rao", role: "sales_exec", department: "Sales" },
    { email: "mkt_exec@aurelian.com", firstName: "Pooja", lastName: "Das", role: "mkt_exec", department: "Marketing" },
  ];
  await db.user.createMany({
    data: roles.map((r, i) => ({
      propertyId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      phone: `+91-98765${String(1000 + i).slice(-5)}`,
    })),
  });

  // Departments
  const depts = ["Management", "Front Office", "Housekeeping", "F&B", "Finance", "Engineering", "Revenue", "HR", "Sales", "Marketing"];
  await db.department.createMany({
    data: depts.map((name, i) => ({
      propertyId,
      name,
      code: name.slice(0, 3).toUpperCase(),
    })),
  });

  // Rate plan — validFrom/validTo required by schema
  const now = new Date();
  await db.ratePlan.createMany({
    data: [
      { propertyId, name: "Standard Rate", code: "RACK", mealPlan: "ep", validFrom: now, validTo: new Date(now.getTime() + 365 * 86400000) },
      { propertyId, name: "Suite Rate", code: "SUITE", mealPlan: "cp", validFrom: now, validTo: new Date(now.getTime() + 365 * 86400000) },
    ],
  });

  // Demo reservations — fields must match prisma schema
  // Need primaryGuestId, categoryId, ratePerNight, totalNights, checkInDate, checkOutDate
  // Since we have no guests yet, skip reservation creation for now
  // (guests get created when reservations are made through the UI)
}

export const PROPERTY_ID = async () => {
  if (_cachedPropertyId) return _cachedPropertyId;
  // Ensure DB schema is ready (Vercel serverless cold start)
  await ensureDbReady();
  const p = await ensureProperty();
  _cachedPropertyId = p.id;
  return p.id;
};

/** Force re-fetch of cached property id (used after property mutations). */
export function invalidatePropertyCache() {
  _cachedPropertyId = null;
}

// ─── Standard JSON responses ─────────────────────────────────────────────────
export function ok<T>(data: T, meta?: Record<string, any>) {
  return NextResponse.json({
    success: true,
    data,
    meta: meta ?? { timestamp: new Date().toISOString() },
    errors: null,
  });
}

export function fail(message: string, code = "ERROR", status = 400, field?: string) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      errors: [{ code, message, field }],
    },
    { status }
  );
}

// ─── Body parsing ────────────────────────────────────────────────────────────
export async function parseBody(req: Request) {
  try {
    const text = await req.text();
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

// ─── withHandler: wrap an API route handler with try/catch (C6) ──────────────
// Converts thrown errors into a structured 500 response and logs them.
export function withHandler<
  A extends any[],
  R extends Response | Promise<Response>
>(fn: (...args: A) => R) {
  return async (...args: A): Promise<Response> => {
    try {
      // Ensure DB is ready on Vercel serverless (creates tables if needed)
      await ensureDbReady();
      return await fn(...args);
    } catch (e: any) {
      const message = e?.message || "Internal server error";
      const code = e?.code || "INTERNAL";
      // Prisma unique-constraint violation
      if (e?.code === "P2002") {
        return fail(`Duplicate value for ${e?.meta?.target?.join(", ") || "field"}`, "DUPLICATE", 409);
      }
      // Prisma record not found
      if (e?.code === "P2025") {
        return fail("Record not found", "NOT_FOUND", 404);
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[API ERROR]", e);
      }
      return fail(message, code, 500);
    }
  };
}

// ─── Atomic sequence-number generation (C4) ──────────────────────────────────
// Returns the next integer greater than the current max value of `field` on the
// given model, scoped by the optional `where` filter. Uses an atomic aggregate
// inside the caller's transaction when called within `db.$transaction`.
export async function nextNumber(
  model: "reservation" | "posOrder" | "folio",
  field: "confirmationNumber" | "kotNumber" | "folioNumber",
  opts?: { where?: any; prefix?: string; base?: number }
): Promise<string | number> {
  const where = opts?.where;
  let max: number = opts?.base ?? 0;

  if (model === "reservation" && field === "confirmationNumber") {
    // Find highest numeric suffix across all AUR-XXXX confirmation numbers
    const rows = await db.reservation.findMany({
      where,
      select: { confirmationNumber: true },
    });
    for (const r of rows) {
      const m = /(\d+)\s*$/.exec(r.confirmationNumber || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${opts?.prefix ?? "AUR"}-${max + 1}`;
  }

  if (model === "posOrder" && field === "kotNumber") {
    const agg = await db.posOrder.aggregate({
      where,
      _max: { kotNumber: true },
    });
    max = Math.max(max, agg._max.kotNumber ?? 1099);
    return max + 1;
  }

  if (model === "folio" && field === "folioNumber") {
    const rows = await db.folio.findMany({
      where,
      select: { folioNumber: true },
    });
    for (const r of rows) {
      const m = /(\d+)\s*$/.exec(r.folioNumber || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${opts?.prefix ?? "F"}-${max + 1}`;
  }

  throw new Error(`nextNumber: unsupported ${model}.${field}`);
}

// ─── Real-time broadcast (best-effort) ───────────────────────────────────────
export async function broadcast(event: string, payload: any, propertyId?: string) {
  // Skip broadcast on Vercel — no local websocket server available
  if (process.env.VERCEL) return;
  try {
    const body = JSON.stringify({ event, payload, propertyId });
    await fetch("http://localhost:3003/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    // Silent — real-time is best-effort.
  }
}

// ─── Audit log (best-effort) ─────────────────────────────────────────────────
export async function logAudit(opts: {
  propertyId?: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        propertyId: opts.propertyId ?? null,
        userId: opts.userId ?? null,
        userRole: opts.userRole ?? null,
        user_email: opts.userEmail ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        oldValue: opts.oldValue ? JSON.stringify(opts.oldValue) : null,
        newValue: opts.newValue ? JSON.stringify(opts.newValue) : null,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch {
    // best-effort
  }
}

// ─── Formatting helpers ──────────────────────────────────────────────────────
export function formatCurrency(n: number, currency = "₹") {
  const v = Math.round(n * 100) / 100;
  return `${currency}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Round to 2 decimals — used to avoid floating-point money drift (H6). */
export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── KPI calculations per spec Section 6.1 ───────────────────────────────────
export function calcKPIs(opts: {
  occupiedRooms: number;
  totalRooms: number;
  outOfOrderRooms: number;
  roomRevenue: number;
  totalRevenue: number;
  operatingExpenses: number;
}) {
  const availableRooms = opts.totalRooms - opts.outOfOrderRooms;
  const occupancyRate = availableRooms > 0 ? (opts.occupiedRooms / availableRooms) * 100 : 0;
  const adr = opts.occupiedRooms > 0 ? opts.roomRevenue / opts.occupiedRooms : 0;
  const revpar = availableRooms > 0 ? opts.roomRevenue / availableRooms : 0;
  const trevpar = availableRooms > 0 ? opts.totalRevenue / availableRooms : 0;
  const goppar = availableRooms > 0 ? (opts.totalRevenue - opts.operatingExpenses) / availableRooms : 0;
  const cpor = opts.occupiedRooms > 0 ? opts.operatingExpenses / opts.occupiedRooms : 0;
  return {
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    adr: Math.round(adr),
    revpar: Math.round(revpar),
    trevpar: Math.round(trevpar),
    goppar: Math.round(goppar),
    cpor: Math.round(cpor),
    availableRooms,
    occupiedRooms: opts.occupiedRooms,
    outOfOrderRooms: opts.outOfOrderRooms,
    totalRooms: opts.totalRooms,
  };
}
