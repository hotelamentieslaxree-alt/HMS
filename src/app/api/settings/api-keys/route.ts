// POST /api/settings/api-keys — Generate a new API key
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { name } = body;

  if (!name) return fail("Key name is required", "VALIDATION");

  // Generate a random API key
  const key = `aria_sk_${randomBytes(24).toString("hex")}`;

  await logAudit({
    propertyId,
    action: "API_KEY_GENERATED",
    entityType: "ApiKey",
    newValue: { name, keyPrefix: key.slice(0, 12) + "..." },
  });

  return ok({
    id: `ak-${Date.now().toString(36)}`,
    name,
    key,
    status: "active",
    created: new Date().toISOString(),
  });
});
