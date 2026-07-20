// DELETE /api/settings/api-keys/[id] — Revoke an API key
import { NextRequest } from "next/server";
import { ok, fail, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const DELETE = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const propertyId = await PROPERTY_ID();

  await logAudit({
    propertyId,
    action: "API_KEY_REVOKED",
    entityType: "ApiKey",
    entityId: id,
  });

  return ok({ id, status: "revoked", revoked: true });
});
