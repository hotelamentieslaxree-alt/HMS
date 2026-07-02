// /api/hr/employees — CRUD for enhanced HR employee data
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── GET: List employees with filters + summary ──────────────────────────────
export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);

  const search = url.searchParams.get("search") || "";
  const departmentCode = url.searchParams.get("department") || "";
  const role = url.searchParams.get("role") || "";
  const isActiveParam = url.searchParams.get("isActive");

  // Default to true when not specified; allow "all" to bypass
  const isActive =
    isActiveParam === "all" ? undefined : isActiveParam === "false" ? false : isActiveParam === null ? true : isActiveParam === "true";

  // Build where clause
  const where: any = { propertyId };

  if (isActive !== undefined) where.isActive = isActive;

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { employeeCode: { contains: search } },
    ];
  }

  if (departmentCode) {
    where.department = { code: departmentCode };
  }

  if (role) {
    where.role = role;
  }

  const employees = await db.user.findMany({
    where,
    include: { department: true },
    orderBy: [{ roleLevel: "asc" }, { firstName: "asc" }],
  });

  // ── Summary statistics ──
  // Get all employees for the property (for accurate totals)
  const allEmployees = await db.user.findMany({
    where: { propertyId },
    include: { department: true },
  });

  const totalEmployees = allEmployees.length;
  const activeCount = allEmployees.filter((e) => e.isActive).length;

  // Group by department
  const byDepartment: Record<string, number> = {};
  for (const e of allEmployees) {
    const deptName = e.department?.name ?? "Unassigned";
    byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
  }

  // Group by role
  const byRole: Record<string, number> = {};
  for (const e of allEmployees) {
    byRole[e.role] = (byRole[e.role] || 0) + 1;
  }

  const summary = { totalEmployees, activeCount, byDepartment, byRole };

  return ok(
    employees.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`,
      email: u.email,
      phone: u.phone,
      role: u.role,
      roleLevel: u.roleLevel,
      employeeCode: u.employeeCode,
      departmentId: u.departmentId,
      department: u.department?.name ?? null,
      departmentCode: u.department?.code ?? null,
      isActive: u.isActive,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    { summary }
  );
});

// ─── POST: Create employee ───────────────────────────────────────────────────
export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const { firstName, lastName, email, role, roleLevel, departmentId, employeeCode, phone, isActive } = body;

  if (!firstName || !lastName) return fail("firstName and lastName are required", "VALIDATION");
  if (!email) return fail("email is required", "VALIDATION");
  if (!role) return fail("role is required", "VALIDATION");

  // Auto-generate employeeCode if not provided (format: EMP-XXX)
  let code = employeeCode;
  if (!code) {
    const lastEmployee = await db.user.findFirst({
      where: { propertyId, employeeCode: { startsWith: "EMP-" } },
      orderBy: { employeeCode: "desc" },
      select: { employeeCode: true },
    });
    const lastNum = lastEmployee?.employeeCode
      ? parseInt(lastEmployee.employeeCode.replace("EMP-", ""), 10)
      : 0;
    code = `EMP-${String(lastNum + 1).padStart(3, "0")}`;
  }

  const user = await db.user.create({
    data: {
      propertyId,
      firstName,
      lastName,
      email,
      role,
      roleLevel: roleLevel ?? 4,
      departmentId: departmentId ?? null,
      employeeCode: code,
      phone: phone ?? null,
      isActive: isActive ?? true,
    },
    include: { department: true },
  });

  return ok({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleLevel: user.roleLevel,
    employeeCode: user.employeeCode,
    departmentId: user.departmentId,
    department: user.department?.name ?? null,
    departmentCode: user.department?.code ?? null,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

// ─── PUT: Update employee ────────────────────────────────────────────────────
export const PUT = withHandler(async (req: Request) => {
  const body = await parseBody(req);
  const { id, firstName, lastName, email, role, roleLevel, departmentId, employeeCode, phone, isActive } = body;

  if (!id) return fail("id is required", "VALIDATION");

  // Build update data with only provided fields
  const data: any = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (roleLevel !== undefined) data.roleLevel = roleLevel;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (employeeCode !== undefined) data.employeeCode = employeeCode;
  if (phone !== undefined) data.phone = phone || null;
  if (isActive !== undefined) data.isActive = isActive;

  const user = await db.user.update({
    where: { id },
    data,
    include: { department: true },
  });

  return ok({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleLevel: user.roleLevel,
    employeeCode: user.employeeCode,
    departmentId: user.departmentId,
    department: user.department?.name ?? null,
    departmentCode: user.department?.code ?? null,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});
