// ARIA HMS — Marketing Campaigns API (Prisma-backed)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");

  const where: any = { propertyId };
  if (status) where.status = status;
  if (platform) where.platform = platform;

  const campaigns = await db.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return ok(campaigns, { total: campaigns.length });
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name?.trim()) return fail("Campaign name is required", "VALIDATION", 400);

  const campaign = await db.campaign.create({
    data: {
      propertyId,
      name: body.name,
      type: body.type || "social",
      platform: body.platform || "multi",
      status: body.status || "draft",
      budget: Number(body.budget) || 0,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
      revenue: 0,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      targetAudience: body.targetAudience || null,
      objective: body.objective || null,
    },
  });

  await broadcast("campaign:created", campaign, propertyId);
  await logAudit({ propertyId, action: "campaign:create", entityType: "Campaign", entityId: campaign.id, newValue: campaign });

  return ok(campaign);
});
