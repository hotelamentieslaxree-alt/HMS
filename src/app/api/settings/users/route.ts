// POST /api/settings/users — Add a new user
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, withHandler, logAudit, broadcast, PROPERTY_ID } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (req: NextRequest) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { firstName, lastName, email, role, phone } = body;

  if (!firstName) return fail("First name is required", "VALIDATION");
  if (!email) return fail("Email is required", "VALIDATION");

  // Check for duplicate email
  const existing = await db.user.findFirst({ where: { email } });
  if (existing) return fail("User with this email already exists", "DUPLICATE", 409);

  const newUser = await db.user.create({
    data: {
      propertyId,
      firstName,
      lastName: lastName || "",
      email,
      role: role || "receptionist",
      phone: phone || null,
      isActive: true,
    },
  });

  await logAudit({
    propertyId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: newUser.id,
    newValue: { firstName, lastName, email, role },
  });

  await broadcast("user:created", { id: newUser.id, name: `${firstName} ${lastName}` }, propertyId);

  return ok(newUser);
});
