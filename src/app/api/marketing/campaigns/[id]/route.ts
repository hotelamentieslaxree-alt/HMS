// ARIA HMS — Marketing Campaign [id] API (Prisma-backed)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, PROPERTY_ID, broadcast, logAudit } from "@/lib/hms";

export const GET = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const campaign = await db.campaign.findFirst({ where: { id, propertyId } });
  if (!campaign) return fail("Campaign not found", "NOT_FOUND", 404);
  return ok(campaign);
});

export const PUT = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const existing = await db.campaign.findFirst({ where: { id, propertyId } });
  if (!existing) return fail("Campaign not found", "NOT_FOUND", 404);

  const body = await parseBody(req);
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.status !== undefined) data.status = body.status;
  if (body.budget !== undefined) data.budget = Number(body.budget);
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.targetAudience !== undefined) data.targetAudience = body.targetAudience;
  if (body.objective !== undefined) data.objective = body.objective;

  const campaign = await db.campaign.update({ where: { id }, data });
  await broadcast("campaign:updated", campaign, propertyId);
  await logAudit({ propertyId, action: "campaign:update", entityType: "Campaign", entityId: id, oldValue: existing, newValue: campaign });

  return ok(campaign);
});

export const DELETE = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();
  const existing = await db.campaign.findFirst({ where: { id, propertyId } });
  if (!existing) return fail("Campaign not found", "NOT_FOUND", 404);

  await db.campaign.delete({ where: { id } });
  await broadcast("campaign:deleted", { id }, propertyId);
  await logAudit({ propertyId, action: "campaign:delete", entityType: "Campaign", entityId: id, oldValue: existing });

  return ok({ id, deleted: true });
});
