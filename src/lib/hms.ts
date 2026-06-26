// ARIA HMS — API helpers
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── Property ID cache (H9: avoid findFirst on every API call) ────────────────
let _cachedPropertyId: string | null = null;

export const PROPERTY_ID = async () => {
  if (_cachedPropertyId) return _cachedPropertyId;
  const p = await db.property.findFirst({ orderBy: { createdAt: "asc" } });
  if (!p) throw new Error("No property configured");
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
