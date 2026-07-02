// /api/hr/payroll — payroll processing & salary slip generation
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler, roundMoney } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── Role-based salary mapping ──────────────────────────────────────────────
const ROLE_BASIC: Record<string, number> = {
  owner: 200000,
  gm: 150000,
  fom: 80000,
  hk_mgr: 80000,
  fb_mgr: 80000,
  rev_mgr: 80000,
  fin_mgr: 80000,
  eng_mgr: 80000,
  hr_mgr: 80000,
  receptionist: 35000,
  hk_attendant: 25000,
  waiter: 25000,
  technician: 25000,
};

// ─── GET: list payroll records with summary ─────────────────────────────────
export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);

  const now = new Date();
  const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);
  const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10);
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("userId");

  if (month < 1 || month > 12) return fail("month must be 1-12", "VALIDATION");
  if (year < 2000 || year > 2100) return fail("year out of range", "VALIDATION");

  const where: any = { propertyId, month, year };
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const records = await db.payrollRecord.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          employeeCode: true,
          department: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ user: { roleLevel: "asc" } }, { user: { firstName: "asc" } }],
  });

  const totalGrossEarnings = records.reduce((s, r) => s + r.grossEarnings, 0);
  const totalDeductions = records.reduce((s, r) => s + r.totalDeductions, 0);
  const totalNetPay = records.reduce((s, r) => s + r.netPay, 0);

  const summary = {
    totalGrossEarnings: roundMoney(totalGrossEarnings),
    totalDeductions: roundMoney(totalDeductions),
    totalNetPay: roundMoney(totalNetPay),
    employeeCount: records.length,
    processedCount: records.filter((r) => r.status === "processed").length,
    draftCount: records.filter((r) => r.status === "draft").length,
    paidCount: records.filter((r) => r.status === "paid").length,
  };

  return ok({
    month,
    year,
    summary,
    records: records.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      status: r.status,
      paidOn: r.paidOn,
      presentDays: r.presentDays,
      absentDays: r.absentDays,
      leaveDays: r.leaveDays,
      halfDays: r.halfDays,
      basicSalary: r.basicSalary,
      hra: r.hra,
      da: r.da,
      conveyance: r.conveyance,
      medical: r.medical,
      specialAllow: r.specialAllow,
      overtime: r.overtime,
      bonus: r.bonus,
      grossEarnings: r.grossEarnings,
      pf: r.pf,
      esi: r.esi,
      tax: r.tax,
      pt: r.pt,
      loanDeduction: r.loanDeduction,
      otherDeductions: r.otherDeductions,
      totalDeductions: r.totalDeductions,
      netPay: r.netPay,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.user.id,
        fullName: `${r.user.firstName} ${r.user.lastName}`,
        email: r.user.email,
        role: r.user.role,
        employeeCode: r.user.employeeCode,
        department: r.user.department?.name ?? null,
      },
    })),
  });
});

// ─── POST: generate / process / pay ─────────────────────────────────────────
export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { action, month: mBody, year: yBody } = body;

  if (!action) return fail("action is required", "VALIDATION");
  if (!["generate", "process", "pay"].includes(action))
    return fail("action must be generate, process, or pay", "VALIDATION");

  const now = new Date();
  const month = mBody ?? now.getMonth() + 1;
  const year = yBody ?? now.getFullYear();

  if (month < 1 || month > 12) return fail("month must be 1-12", "VALIDATION");
  if (year < 2000 || year > 2100) return fail("year out of range", "VALIDATION");

  // ── Generate payroll for all active users ──────────────────────────────────
  if (action === "generate") {
    const users = await db.user.findMany({
      where: { propertyId, isActive: true },
      include: { department: { select: { name: true } } },
    });

    if (users.length === 0) return ok({ generated: 0, message: "No active users found" });

    // Build date range for the target month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1); // exclusive upper bound

    let generated = 0;

    for (const user of users) {
      const basic = ROLE_BASIC[user.role] ?? 25000; // default to lowest tier

      // Earnings
      const hra = roundMoney(basic * 0.4);
      const da = roundMoney(basic * 0.1);
      const conveyance = 3200;
      const medical = 2500;
      const targetGross = roundMoney(basic * 1.8);
      const specialAllow = roundMoney(targetGross - (basic + hra + da + conveyance + medical));

      // Attendance aggregation
      const attendanceRecords = await db.attendance.findMany({
        where: {
          userId: user.id,
          date: { gte: monthStart, lt: monthEnd },
        },
      });

      const presentDays = attendanceRecords.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const absentDays = attendanceRecords.filter((a) => a.status === "absent").length;
      const leaveDays = attendanceRecords.filter((a) => a.status === "on_leave").length;
      const halfDays = attendanceRecords.filter((a) => a.status === "half_day").length;

      // Overtime: sum of overtimeHours * hourly rate (basic/30/8)
      const totalOvertimeHours = attendanceRecords.reduce((s, a) => s + (a.overtimeHours || 0), 0);
      const hourlyRate = basic / 30 / 8;
      const overtime = roundMoney(totalOvertimeHours * hourlyRate);

      const bonus = 0; // no auto-bonus

      const grossEarnings = roundMoney(
        basic + hra + da + conveyance + medical + specialAllow + overtime + bonus
      );

      // Deductions
      const pf = roundMoney(basic * 0.12); // employee share
      const esi = roundMoney(grossEarnings * 0.0075);
      const tax = 0; // simplified — no income tax
      const pt = 200; // flat professional tax
      const loanDeduction = 0;
      const otherDeductions = 0;

      const totalDeductions = roundMoney(pf + esi + tax + pt + loanDeduction + otherDeductions);
      const netPay = roundMoney(grossEarnings - totalDeductions);

      await db.payrollRecord.upsert({
        where: { userId_month_year: { userId: user.id, month, year } },
        update: {
          propertyId,
          basicSalary: basic,
          hra,
          da,
          conveyance,
          medical,
          specialAllow,
          overtime,
          bonus,
          grossEarnings,
          pf,
          esi,
          tax,
          pt,
          loanDeduction,
          otherDeductions,
          totalDeductions,
          netPay,
          presentDays,
          absentDays,
          leaveDays,
          halfDays,
          status: "draft",
          paidOn: null,
        },
        create: {
          propertyId,
          userId: user.id,
          month,
          year,
          basicSalary: basic,
          hra,
          da,
          conveyance,
          medical,
          specialAllow,
          overtime,
          bonus,
          grossEarnings,
          pf,
          esi,
          tax,
          pt,
          loanDeduction,
          otherDeductions,
          totalDeductions,
          netPay,
          presentDays,
          absentDays,
          leaveDays,
          halfDays,
          status: "draft",
        },
      });

      generated++;
    }

    return ok({
      generated,
      month,
      year,
      message: `Payroll generated for ${generated} active employee(s)`,
    });
  }

  // ── Process: draft → processed ─────────────────────────────────────────────
  if (action === "process") {
    const result = await db.payrollRecord.updateMany({
      where: { propertyId, month, year, status: "draft" },
      data: { status: "processed" },
    });

    return ok({
      processed: result.count,
      month,
      year,
      message: `${result.count} record(s) moved to processed`,
    });
  }

  // ── Pay: processed → paid ──────────────────────────────────────────────────
  if (action === "pay") {
    const result = await db.payrollRecord.updateMany({
      where: { propertyId, month, year, status: "processed" },
      data: { status: "paid", paidOn: new Date() },
    });

    return ok({
      paid: result.count,
      month,
      year,
      message: `${result.count} record(s) marked as paid`,
    });
  }

  return fail("Unhandled action", "LOGIC", 500);
});
