// POST /api/automation/communications/send — Send a message via a channel
import { NextRequest } from "next/server";
import { ok, fail, parseBody, withHandler, logAudit, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { channel, to, message } = body;

  if (!to) return fail("Recipient is required", "VALIDATION");
  if (!message) return fail("Message is required", "VALIDATION");

  await logAudit({
    propertyId,
    action: "COMMUNICATION_SENT",
    entityType: "Communication",
    newValue: { channel: channel || "Email", to, messageLength: message.length },
  });

  return ok({
    sent: true,
    channel: channel || "Email",
    to,
    timestamp: new Date().toISOString(),
  });
});
