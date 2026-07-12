// GET /api/purchasing/season-config — list season configs
// POST /api/purchasing/season-config — create/update season config
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "";
  const activeOnly = searchParams.get("active") !== "false";
  const current = searchParams.get("current") === "true";

  const where: any = { propertyId };
  if (activeOnly) where.isActive = true;
  if (category) where.category = category;

  let configs = await db.seasonConfig.findMany({
    where,
    orderBy: { startDate: "asc" },
  });

  // If "current" filter, return only seasons active right now
  if (current) {
    const now = new Date();
    configs = configs.filter((c) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return start <= now && end >= now;
    });
  }

  return ok(configs);
});

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  if (!body.name || !body.category || !body.startDate || !body.endDate) {
    return fail("name, category, startDate, and endDate are required", "VALIDATION", 400);
  }

  const validCategories = [
    "kitchen", "bedroom_linen", "bathroom_linen", "minibar",
    "bathroom_amenity", "living_room", "safety", "electronics", "stationery",
  ];
  if (!validCategories.includes(body.category)) {
    return fail(`category must be one of: ${validCategories.join(", ")}`, "VALIDATION", 400);
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);

  if (endDate <= startDate) {
    return fail("endDate must be after startDate", "VALIDATION", 400);
  }

  // If id is provided, update existing; otherwise create new
  if (body.id) {
    const existing = await db.seasonConfig.findFirst({
      where: { id: body.id, propertyId },
    });
    if (!existing) {
      return fail("Season config not found", "NOT_FOUND", 404);
    }

    const updated = await db.seasonConfig.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category,
        multiplier: body.multiplier ?? existing.multiplier,
        startDate,
        endDate,
        isActive: body.isActive ?? existing.isActive,
        autoReorder: body.autoReorder ?? existing.autoReorder,
      },
    });

    await logAudit({
      propertyId,
      action: "SEASON_CONFIG_UPDATED",
      entityType: "SeasonConfig",
      entityId: body.id,
      oldValue: existing,
      newValue: updated,
    });

    await broadcast("purchasing:season_config_updated", updated, propertyId);

    return ok(updated);
  }

  const config = await db.seasonConfig.create({
    data: {
      propertyId,
      name: body.name,
      category: body.category,
      multiplier: body.multiplier ?? 1,
      startDate,
      endDate,
      isActive: body.isActive ?? true,
      autoReorder: body.autoReorder ?? false,
    },
  });

  await logAudit({
    propertyId,
    action: "SEASON_CONFIG_CREATED",
    entityType: "SeasonConfig",
    entityId: config.id,
    newValue: config,
  });

  await broadcast("purchasing:season_config_created", config, propertyId);

  // If autoReorder is enabled and season is currently active, trigger reorder alerts
  if (config.autoReorder && config.isActive) {
    const now = new Date();
    if (startDate <= now && endDate >= now) {
      const itemsBelow = await db.amenityItem.findMany({
        where: { propertyId, category: body.category, isActive: true },
      });
      const belowParItems = itemsBelow.filter((i) => i.quantity < i.parLevel * config.multiplier);
      if (belowParItems.length > 0) {
        await broadcast("purchasing:season_reorder_alert", {
          seasonConfig: config,
          itemsBelowPar: belowParItems,
        }, propertyId);
      }
    }
  }

  return ok(config);
});
