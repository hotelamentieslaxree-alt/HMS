// GET /api/modules — list module configurations for the property
// PUT /api/modules — toggle module ON/OFF
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, broadcast, logAudit, PROPERTY_ID } from "@/lib/hms";
import { DEFAULT_MODULES, MODULE_GROUPS } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();

  // Fetch DB configs for this property
  const dbConfigs = await db.moduleConfig.findMany({
    where: { propertyId },
  });

  // Build a map from DB for quick lookup
  const dbMap = new Map(dbConfigs.map((c) => [c.moduleKey, c]));

  // Merge defaults with DB overrides
  const modules = DEFAULT_MODULES.map((def) => {
    const dbEntry = dbMap.get(def.key);
    return {
      key: def.key,
      label: def.label,
      group: def.group,
      required: def.required ?? false,
      enabled: dbEntry ? dbEntry.enabled : def.enabled,
      config: dbEntry ? dbEntry.config : "{}",
      dbId: dbEntry?.id ?? null,
    };
  });

  return ok({ modules, groups: MODULE_GROUPS });
});

export const PUT = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { moduleKey, enabled } = body;

  if (!moduleKey || typeof enabled !== "boolean") {
    return fail("moduleKey and enabled (boolean) are required", "VALIDATION", 400);
  }

  // Check if module exists in defaults
  const defaultMod = DEFAULT_MODULES.find((m) => m.key === moduleKey);
  if (!defaultMod) {
    return fail(`Unknown module key: ${moduleKey}`, "NOT_FOUND", 404);
  }

  // Prevent disabling required modules
  if (defaultMod.required && !enabled) {
    return fail(`Cannot disable required module: ${moduleKey}`, "FORBIDDEN", 403);
  }

  // Upsert into ModuleConfig
  const upserted = await db.moduleConfig.upsert({
    where: {
      propertyId_moduleKey: { propertyId, moduleKey },
    },
    create: {
      propertyId,
      moduleKey,
      enabled,
    },
    update: {
      enabled,
    },
  });

  // Audit log
  await logAudit({
    propertyId,
    action: enabled ? "MODULE_ENABLED" : "MODULE_DISABLED",
    entityType: "ModuleConfig",
    entityId: upserted.id,
    newValue: { moduleKey, enabled },
  });

  // Broadcast real-time event
  await broadcast("module:updated", { moduleKey, enabled }, propertyId);

  return ok(upserted);
});
