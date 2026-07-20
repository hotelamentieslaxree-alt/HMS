// ARIA HMS — Social Account Disconnect API (Prisma-backed)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, withHandler, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";

export const PUT = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  const existing = await db.socialAccount.findFirst({ where: { id, propertyId } });
  if (!existing) return fail("Social account not found", "NOT_FOUND", 404);

  const updated = await db.socialAccount.update({
    where: { id },
    data: {
      isActive: false,
      handle: "",
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      engagementRate: 0,
      lastSyncedAt: null,
    },
  });

  await broadcast("social:disconnected", { id }, propertyId);
  await logAudit({ propertyId, action: "social:disconnect", entityType: "SocialAccount", entityId: id, oldValue: existing, newValue: updated });

  return ok(updated);
});
