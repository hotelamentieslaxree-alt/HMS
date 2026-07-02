// /api/hr/attendance — Employee attendance with Excel upload
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler, logAudit, broadcast } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES = ["present", "absent", "half_day", "late", "on_leave", "holiday", "weekly_off"] as const;
const VALID_SOURCES = ["manual", "excel", "biometric", "system"] as const;

function isValidStatus(s: string): s is (typeof VALID_STATUSES)[number] {
  return VALID_STATUSES.includes(s as any);
}

function isValidSource(s: string): s is (typeof VALID_SOURCES)[number] {
  return VALID_SOURCES.includes(s as any);
}

/** Calculate work hours from check-in and check-out Date objects. */
function calcWorkHours(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
}

/** Overtime = max(0, workHours - 9). */
function calcOvertime(workHours: number): number {
  return Math.max(0, Math.round((workHours - 9) * 100) / 100);
}

/** Get the ISO date string for the start of a month. */
function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/** Get the ISO date string for the end of a month. */
function monthEnd(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/** Get the week number within a month (1-based). */
function weekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay(); // 0=Sun
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + offset) / 7);
}

/** Get week label like "Week 1 (Jan 1 – Jan 7)". */
function weekLabel(year: number, month: number, weekNum: number): string {
  const firstDay = new Date(year, month - 1, 1);
  const offset = firstDay.getDay();
  const startDay = (weekNum - 1) * 7 - offset + 1;
  const startDate = new Date(year, month - 1, Math.max(1, startDay));
  const endDate = new Date(year, month - 1, Math.min(startDay + 6, new Date(year, month, 0).getDate()));
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `Week ${weekNum} (${fmt(startDate)} – ${fmt(endDate)})`;
}

// ─── GET — Attendance list + summary ────────────────────────────────────────

export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);

  const now = new Date();
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
  const userId = url.searchParams.get("userId") || undefined;
  const view = url.searchParams.get("view") || "monthly";

  if (month < 1 || month > 12) return fail("month must be 1-12", "VALIDATION");
  if (year < 2000 || year > 2100) return fail("Invalid year", "VALIDATION");
  if (!["daily", "weekly", "monthly"].includes(view)) return fail("view must be daily|weekly|monthly", "VALIDATION");

  // Build date range for the month
  const startDate = monthStart(year, month);
  const endDate = monthEnd(year, month);

  // Fetch attendance records
  const records = await db.attendance.findMany({
    where: {
      propertyId,
      date: { gte: startDate, lte: endDate },
      ...(userId ? { userId } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { user: { firstName: "asc" } }],
  });

  // Map to clean output
  const attendance = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    date: r.date,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    status: r.status,
    overtimeHours: r.overtimeHours,
    workHours: r.workHours,
    notes: r.notes,
    source: r.source,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: {
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      employeeCode: r.user.employeeCode,
      department: r.user.department?.name ?? null,
    },
  }));

  // Summary
  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalLate = records.filter((r) => r.status === "late").length;
  const totalHalfDay = records.filter((r) => r.status === "half_day").length;
  const totalOnLeave = records.filter((r) => r.status === "on_leave").length;
  const totalHolidays = records.filter((r) => r.status === "holiday" || r.status === "weekly_off").length;
  const totalRecords = records.length;
  const attendanceRate = totalRecords > 0 ? Math.round(((totalPresent + totalLate + totalHalfDay) / totalRecords) * 10000) / 100 : 0;

  const summary = {
    totalPresent,
    totalAbsent,
    totalLate,
    totalHalfDay,
    totalOnLeave,
    totalHolidays,
    totalRecords,
    attendanceRate,
  };

  // View-specific shaping
  if (view === "daily") {
    // Today's attendance list
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecords = await db.attendance.findMany({
      where: {
        propertyId,
        date: { gte: today, lte: todayEnd },
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ user: { firstName: "asc" } }],
    });

    const todayAttendance = todayRecords.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      overtimeHours: r.overtimeHours,
      workHours: r.workHours,
      notes: r.notes,
      source: r.source,
      user: {
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        employeeCode: r.user.employeeCode,
        department: r.user.department?.name ?? null,
      },
    }));

    return ok({
      attendance,
      todayAttendance,
      summary,
    });
  }

  if (view === "weekly") {
    // Group records by week of the month
    const weeks: Record<number, typeof attendance> = {};
    for (const rec of attendance) {
      const d = new Date(rec.date);
      const wk = weekOfMonth(d);
      if (!weeks[wk]) weeks[wk] = [];
      weeks[wk].push(rec);
    }

    const weeklyData = Object.entries(weeks)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([wk, recs]) => ({
        week: Number(wk),
        label: weekLabel(year, month, Number(wk)),
        records: recs,
        summary: {
          totalPresent: recs.filter((r) => r.status === "present").length,
          totalAbsent: recs.filter((r) => r.status === "absent").length,
          totalLate: recs.filter((r) => r.status === "late").length,
          totalHalfDay: recs.filter((r) => r.status === "half_day").length,
          totalOnLeave: recs.filter((r) => r.status === "on_leave").length,
          totalHolidays: recs.filter((r) => r.status === "holiday" || r.status === "weekly_off").length,
          totalRecords: recs.length,
        },
      }));

    return ok({
      weeklyData,
      summary,
    });
  }

  // view === "monthly" (default)
  return ok({
    attendance,
    summary,
  });
});

// ─── POST — Create or update single attendance record (upsert) ──────────────

export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const { userId, date, checkIn, checkOut, status, overtimeHours, workHours, notes, source } = body;

  if (!userId) return fail("userId is required", "VALIDATION", 400, "userId");
  if (!date) return fail("date is required", "VALIDATION", 400, "date");

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return fail("Invalid date format", "VALIDATION", 400, "date");

  // Normalize date to start of day for unique constraint matching
  const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

  if (status && !isValidStatus(status)) {
    return fail(`status must be one of: ${VALID_STATUSES.join(", ")}`, "VALIDATION", 400, "status");
  }

  if (source && !isValidSource(source)) {
    return fail(`source must be one of: ${VALID_SOURCES.join(", ")}`, "VALIDATION", 400, "source");
  }

  // Parse checkIn / checkOut
  let checkInDate: Date | null = checkIn ? new Date(checkIn) : null;
  let checkOutDate: Date | null = checkOut ? new Date(checkOut) : null;

  if (checkIn && isNaN(checkInDate!.getTime())) return fail("Invalid checkIn format", "VALIDATION", 400, "checkIn");
  if (checkOut && isNaN(checkOutDate!.getTime())) return fail("Invalid checkOut format", "VALIDATION", 400, "checkOut");

  // Auto-calculate workHours and overtime when both checkIn and checkOut provided
  let finalWorkHours = workHours ?? 0;
  let finalOvertimeHours = overtimeHours ?? 0;

  if (checkInDate && checkOutDate) {
    finalWorkHours = calcWorkHours(checkInDate, checkOutDate);
    finalOvertimeHours = calcOvertime(finalWorkHours);
  } else if (workHours !== undefined) {
    finalWorkHours = workHours;
    finalOvertimeHours = overtimeHours !== undefined ? overtimeHours : calcOvertime(workHours);
  }

  // Verify user belongs to property
  const user = await db.user.findFirst({ where: { id: userId, propertyId } });
  if (!user) return fail("User not found in this property", "NOT_FOUND", 404);

  // Upsert on userId + date
  const record = await db.attendance.upsert({
    where: {
      userId_date: { userId, date: normalizedDate },
    },
    update: {
      ...(checkInDate !== null ? { checkIn: checkInDate } : {}),
      ...(checkOutDate !== null ? { checkOut: checkOutDate } : {}),
      ...(status ? { status } : {}),
      workHours: finalWorkHours,
      overtimeHours: finalOvertimeHours,
      ...(notes !== undefined ? { notes } : {}),
      ...(source ? { source } : {}),
    },
    create: {
      propertyId,
      userId,
      date: normalizedDate,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: status || "present",
      workHours: finalWorkHours,
      overtimeHours: finalOvertimeHours,
      notes: notes || null,
      source: source || "manual",
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  await broadcast("attendance.updated", { userId, date: normalizedDate, status: record.status }, propertyId);

  return ok({
    attendance: {
      id: record.id,
      userId: record.userId,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      overtimeHours: record.overtimeHours,
      workHours: record.workHours,
      notes: record.notes,
      source: record.source,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      user: {
        firstName: record.user.firstName,
        lastName: record.user.lastName,
        employeeCode: record.user.employeeCode,
        department: record.user.department?.name ?? null,
      },
    },
  });
});

// ─── PUT — Bulk upsert (Excel upload) ──────────────────────────────────────

export const PUT = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);
  const { records } = body;

  if (!Array.isArray(records) || records.length === 0) {
    return fail("records array is required and must not be empty", "VALIDATION");
  }

  if (records.length > 1000) {
    return fail("Bulk upload limited to 1000 records at a time", "VALIDATION");
  }

  // Validate all records first
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.userId) return fail(`records[${i}].userId is required`, "VALIDATION", 400, `records[${i}].userId`);
    if (!r.date) return fail(`records[${i}].date is required`, "VALIDATION", 400, `records[${i}].date`);
    if (r.status && !isValidStatus(r.status)) {
      return fail(`records[${i}].status must be one of: ${VALID_STATUSES.join(", ")}`, "VALIDATION", 400, `records[${i}].status`);
    }
  }

  let processed = 0;

  // Process records in transaction for consistency
  await db.$transaction(async (tx) => {
    for (const r of records) {
      const dateObj = new Date(r.date);
      const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

      // Parse times
      let checkInDate: Date | null = r.checkIn ? new Date(r.checkIn) : null;
      let checkOutDate: Date | null = r.checkOut ? new Date(r.checkOut) : null;

      // Auto-calculate workHours and overtime when both times provided
      let finalWorkHours = r.workHours ?? 0;
      let finalOvertimeHours = r.overtimeHours ?? 0;

      if (checkInDate && checkOutDate) {
        finalWorkHours = calcWorkHours(checkInDate, checkOutDate);
        finalOvertimeHours = calcOvertime(finalWorkHours);
      } else if (r.workHours !== undefined) {
        finalWorkHours = r.workHours;
        finalOvertimeHours = r.overtimeHours !== undefined ? r.overtimeHours : calcOvertime(r.workHours);
      }

      await tx.attendance.upsert({
        where: {
          userId_date: { userId: r.userId, date: normalizedDate },
        },
        update: {
          ...(checkInDate ? { checkIn: checkInDate } : {}),
          ...(checkOutDate ? { checkOut: checkOutDate } : {}),
          ...(r.status ? { status: r.status } : {}),
          workHours: finalWorkHours,
          overtimeHours: finalOvertimeHours,
          ...(r.notes !== undefined ? { notes: r.notes } : {}),
          source: "excel",
        },
        create: {
          propertyId,
          userId: r.userId,
          date: normalizedDate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: r.status || "present",
          workHours: finalWorkHours,
          overtimeHours: finalOvertimeHours,
          notes: r.notes || null,
          source: "excel",
        },
      });

      processed++;
    }
  });

  await logAudit({
    propertyId,
    action: "ATTENDANCE_BULK_UPLOAD",
    entityType: "attendance",
    newValue: { recordCount: processed, source: "excel" },
  });

  await broadcast("attendance.bulkUploaded", { recordCount: processed, source: "excel" }, propertyId);

  return ok({
    summary: {
      processed,
      total: records.length,
      source: "excel",
    },
  });
});
