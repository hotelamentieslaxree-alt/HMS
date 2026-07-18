// PUT /api/settings/users/[id]/lock — Lock/unlock a user account
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, logAudit, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { locked } = body;

  // Find the user
  const user = await db.user.findFirst({ where: { id } });
  if (!user) return fail("User not found", "NOT_FOUND", 404);

  // Toggle active status based on locked flag
  const updated = await db.user.update({
    where: { id },
    data: { isActive: !locked },
  });

  await logAudit({
    propertyId,
    action: locked ? "USER_LOCKED" : "USER_UNLOCKED",
    entityType: "User",
    entityId: id,
    newValue: { isActive: !locked },
  });

  await broadcast("user:updated", { id, isActive: !locked }, propertyId);

  return ok({
    id,
    isActive: !locked,
    locked,
  });
});
