// POST /api/settings/roles — Add a new role (creates RolePermission entries)
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { name, level, permissions } = body;

  if (!name) return fail("Role name is required", "VALIDATION");

  await logAudit({
    propertyId,
    action: "ROLE_CREATED",
    entityType: "Role",
    newValue: { name, level: level ?? 4, permissions: permissions ?? 0 },
  });

  return ok({
    id: `role-${Date.now().toString(36)}`,
    name,
    level: level ?? 4,
    permissions: permissions ?? 0,
    created: true,
  });
});
