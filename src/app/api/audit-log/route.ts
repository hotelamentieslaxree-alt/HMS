// GET /api/audit-log — recent audit events
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "40");
  const action = url.searchParams.get("action");

  const logs = await db.auditLog.findMany({
    where: { propertyId, ...(action ? { action } : {}) },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  return ok(logs.map((l) => ({
    id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId,
    userRole: l.userRole, userEmail: l.user_email,
    oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
    newValue: l.newValue ? JSON.parse(l.newValue) : null,
    ipAddress: l.ipAddress, occurredAt: l.occurredAt,
  })));
});
