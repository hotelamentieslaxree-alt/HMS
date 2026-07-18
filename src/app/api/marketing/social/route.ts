// ARIA HMS — Social Accounts API (Prisma-backed)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");

  const where: any = { propertyId };
  if (platform) where.platform = platform;

  const accounts = await db.socialAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return ok(accounts, { total: accounts.length });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.platform?.trim()) return fail("Platform is required", "VALIDATION", 400);
  if (!body.handle?.trim()) return fail("Handle is required", "VALIDATION", 400);

  // Check for duplicate
  const existing = await db.socialAccount.findFirst({
    where: { propertyId, platform: body.platform, handle: body.handle },
  });
  if (existing) return fail("Account already connected for this platform and handle", "DUPLICATE", 409);

  const account = await db.socialAccount.create({
    data: {
      propertyId,
      platform: body.platform,
      handle: body.handle,
      displayName: body.displayName || null,
      avatarUrl: body.avatarUrl || null,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      engagementRate: 0,
      isActive: true,
      lastSyncedAt: new Date(),
    },
  });

  await broadcast("social:connected", account, propertyId);
  await logAudit({ propertyId, action: "social:connect", entityType: "SocialAccount", entityId: account.id, newValue: account });

  return ok(account);
});
