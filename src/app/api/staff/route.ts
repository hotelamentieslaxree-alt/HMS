// GET /api/staff — list staff with departments
import { db } from "@/lib/db";
import { ok, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const propertyId = await PROPERTY_ID();
  const users = await db.user.findMany({
    where: { propertyId },
    include: { department: true },
    orderBy: [{ roleLevel: "asc" }, { firstName: "asc" }],
  });
  return ok(users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email,
    phone: u.phone,
    role: u.role,
    roleLevel: u.roleLevel,
    employeeCode: u.employeeCode,
    department: u.department?.name ?? null,
    departmentCode: u.department?.code ?? null,
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
  })));
});
