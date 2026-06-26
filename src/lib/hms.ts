// ARIA HMS — API helpers
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const PROPERTY_ID = async () => {
  // For this single-property demo, return the first (only) property.
  const p = await db.property.findFirst();
  if (!p) throw new Error("No property configured");
  return p.id;
};

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

export async function parseBody(req: Request) {
  try {
    const text = await req.text();
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

// Broadcast a real-time event to the socket.io mini-service on port 3003.
// Failures are logged but never throw — real-time is best-effort.
export async function broadcast(event: string, payload: any, propertyId?: string) {
  try {
    const body = JSON.stringify({ event, payload, propertyId });
    await fetch("http://localhost:3003/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (e) {
    // Silent — real-time is best-effort.
  }
}

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

// KPI calculations per spec Section 6.1
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
