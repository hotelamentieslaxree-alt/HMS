// ARIA HMS — HR Seed script
// Populates attendance, payroll, company events, and scorecards for current month.
// Run: cd /home/z/my-project && bunx tsx prisma/seed-hr.ts

import { PrismaClient } from "@prisma/client";
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  getDay,
  startOfDay,
  setHours,
  setMinutes,
  subDays,
} from "date-fns";

const db = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min: number, max: number, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

// Create a Date on a given base day at a specific hour:minute
function atTime(day: Date, hour: number, minute: number): Date {
  return setMinutes(setHours(startOfDay(day), hour), minute);
}

// Random time within a range on a given day (inclusive of bounds)
function randomTimeBetween(day: Date, h1: number, m1: number, h2: number, m2: number): Date {
  const start = atTime(day, h1, m1).getTime();
  const end = atTime(day, h2, m2).getTime();
  const ts = start + Math.random() * (end - start);
  return new Date(ts);
}

// Weighted random attendance status
function randomAttendanceStatus(): string {
  const r = Math.random() * 100;
  if (r < 80) return "present";    // 80%
  if (r < 85) return "late";       // 5%
  if (r < 90) return "half_day";   // 5%
  if (r < 93) return "on_leave";   // 3%
  if (r < 95) return "absent";     // 2%
  return "holiday";                 // 5%
}

// Role-based basic salary map
const SALARY_MAP: Record<string, number> = {
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

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding HR data for ARIA HMS...");

  // 0. Delete existing HR data (in dependency order)
  console.log("  🧹 Cleaning existing HR data...");
  await db.scorecard.deleteMany();
  await db.payrollRecord.deleteMany();
  await db.companyEvent.deleteMany();
  await db.attendance.deleteMany();
  console.log("  ✅ Existing HR data cleared.");

  // Fetch existing users and property
  const users = await db.user.findMany();
  const properties = await db.property.findMany();

  if (users.length === 0) {
    console.error("  ❌ No users found. Run the main seed first.");
    process.exit(1);
  }

  const property = properties[0];
  const propertyId = property.id;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const period = format(now, "yyyy-MM"); // e.g. "2026-03"

  console.log(`  📅 Period: ${period} (${format(monthStart, "yyyy-MM-dd")} → ${format(monthEnd, "yyyy-MM-dd")})`);
  console.log(`  👥 Users: ${users.length}`);

  // ══════════════════════════════════════════════════════════════
  // 1. ATTENDANCE RECORDS
  // ══════════════════════════════════════════════════════════════
  console.log("  📋 Generating attendance records...");

  // Collect all working days (Mon-Sat) in current month, skip Sundays
  const workingDays: Date[] = [];
  let cursor = monthStart;
  while (cursor <= monthEnd) {
    const dayOfWeek = getDay(cursor); // 0=Sun, 1=Mon, ..., 6=Sat
    if (dayOfWeek !== 0) {
      workingDays.push(startOfDay(cursor));
    }
    cursor = addDays(cursor, 1);
  }

  // Only generate attendance for days up to today (not future)
  const pastWorkingDays = workingDays.filter((d) => d <= now);
  console.log(`    Total working days in month: ${workingDays.length}, past: ${pastWorkingDays.length}`);

  // For each user, generate attendance for each past working day
  const attendanceData: Array<{
    propertyId: string;
    userId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: string;
    workHours: number;
    overtimeHours: number;
    notes: string | null;
    source: string;
  }> = [];

  // Track attendance counts per user for payroll
  const attendanceCounts: Record<string, {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
    totalOvertime: number;
  }> = {};

  for (const user of users) {
    attendanceCounts[user.id] = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, holiday: 0, totalOvertime: 0 };

    for (const day of pastWorkingDays) {
      const status = randomAttendanceStatus();
      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let workHours = 0;
      let overtimeHours = 0;

      switch (status) {
        case "present": {
          // checkIn between 08:30-09:30
          checkIn = randomTimeBetween(day, 8, 30, 9, 30);
          // checkOut between 17:30-18:30
          checkOut = randomTimeBetween(day, 17, 30, 18, 30);
          workHours = parseFloat(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
          // Overtime if worked more than 9 hours
          if (workHours > 9) {
            overtimeHours = parseFloat((workHours - 9).toFixed(2));
          }
          attendanceCounts[user.id].present++;
          break;
        }
        case "late": {
          // checkIn between 09:45-11:00
          checkIn = randomTimeBetween(day, 9, 45, 11, 0);
          // checkOut between 17:30-18:30
          checkOut = randomTimeBetween(day, 17, 30, 18, 30);
          workHours = parseFloat(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
          if (workHours > 9) {
            overtimeHours = parseFloat((workHours - 9).toFixed(2));
          }
          attendanceCounts[user.id].late++;
          break;
        }
        case "half_day": {
          // checkIn between 08:30-09:30
          checkIn = randomTimeBetween(day, 8, 30, 9, 30);
          // checkOut between 13:00-14:00
          checkOut = randomTimeBetween(day, 13, 0, 14, 0);
          workHours = parseFloat(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
          attendanceCounts[user.id].halfDay++;
          break;
        }
        case "on_leave": {
          attendanceCounts[user.id].onLeave++;
          break;
        }
        case "absent": {
          attendanceCounts[user.id].absent++;
          break;
        }
        case "holiday": {
          attendanceCounts[user.id].holiday++;
          break;
        }
      }

      attendanceCounts[user.id].totalOvertime += overtimeHours;

      // Source: mostly "system", some "manual"
      const source = Math.random() < 0.9 ? "system" : "manual";

      // Notes for special cases
      let notes: string | null = null;
      if (status === "late") notes = "Late arrival";
      else if (status === "half_day") notes = "Half day - personal";
      else if (status === "on_leave") notes = pick(["Casual leave", "Sick leave", "Earned leave", "Personal leave"]);
      else if (status === "holiday") notes = pick(["Diwali", "Holi", "Republic Day", "Independence Day", "Gandhi Jayanti"]);

      attendanceData.push({
        propertyId,
        userId: user.id,
        date: day,
        checkIn,
        checkOut,
        status,
        workHours,
        overtimeHours,
        notes,
        source,
      });
    }
  }

  // Insert attendance in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < attendanceData.length; i += BATCH_SIZE) {
    const batch = attendanceData.slice(i, i + BATCH_SIZE);
    await db.attendance.createMany({ data: batch });
  }
  console.log(`    ✅ Created ${attendanceData.length} attendance records`);

  // ══════════════════════════════════════════════════════════════
  // 2. PAYROLL RECORDS
  // ══════════════════════════════════════════════════════════════
  console.log("  💰 Generating payroll records...");

  const payrollData: Array<{
    propertyId: string;
    userId: string;
    month: number;
    year: number;
    basicSalary: number;
    hra: number;
    da: number;
    conveyance: number;
    medical: number;
    specialAllow: number;
    overtime: number;
    bonus: number;
    grossEarnings: number;
    pf: number;
    esi: number;
    tax: number;
    pt: number;
    loanDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    halfDays: number;
    status: string;
    paidOn: Date | null;
  }> = [];

  for (const user of users) {
    const basic = SALARY_MAP[user.role] || 25000;
    const hra = parseFloat((basic * 0.4).toFixed(2));
    const da = parseFloat((basic * 0.1).toFixed(2));
    const conveyance = 3200;
    const medical = 2500;
    const specialAllow = parseFloat((basic * 1.8 - basic - hra - da - conveyance - medical).toFixed(2));

    // Overtime pay: hourly rate × total overtime hours
    const hourlyRate = basic / (workingDays.length * 9);
    const overtimePay = parseFloat((attendanceCounts[user.id].totalOvertime * hourlyRate).toFixed(2));

    const gross = basic + hra + da + conveyance + medical + specialAllow + overtimePay;

    const pf = parseFloat((basic * 0.12).toFixed(2));
    const esi = parseFloat((gross * 0.0075).toFixed(2));
    const pt = 200;
    // Simple tax estimate: 10% for basic >= 100k, 5% for basic >= 50k, 0 otherwise
    let tax = 0;
    if (basic >= 100000) tax = parseFloat((gross * 0.1).toFixed(2));
    else if (basic >= 50000) tax = parseFloat((gross * 0.05).toFixed(2));

    const totalDeductions = parseFloat((pf + esi + pt + tax).toFixed(2));
    const netPay = parseFloat((gross - totalDeductions).toFixed(2));

    const counts = attendanceCounts[user.id];

    // Mix of payroll statuses
    let status: string;
    const r = Math.random();
    if (r < 0.3) status = "draft";
    else if (r < 0.65) status = "processed";
    else status = "paid";

    const paidOn = status === "paid" ? addDays(now, -randInt(1, 5)) : null;

    payrollData.push({
      propertyId,
      userId: user.id,
      month: currentMonth,
      year: currentYear,
      basicSalary: basic,
      hra,
      da,
      conveyance,
      medical,
      specialAllow,
      overtime: overtimePay,
      bonus: 0,
      grossEarnings: parseFloat(gross.toFixed(2)),
      pf,
      esi,
      tax,
      pt,
      loanDeduction: 0,
      otherDeductions: 0,
      totalDeductions,
      netPay,
      presentDays: counts.present,
      absentDays: counts.absent,
      leaveDays: counts.onLeave,
      halfDays: counts.halfDay,
      status,
      paidOn,
    });
  }

  await db.payrollRecord.createMany({ data: payrollData });
  console.log(`    ✅ Created ${payrollData.length} payroll records`);

  // ══════════════════════════════════════════════════════════════
  // 3. COMPANY EVENTS
  // ══════════════════════════════════════════════════════════════
  console.log("  🎉 Generating company events...");

  const hrMgr = users.find((u) => u.role === "hr_mgr");
  const gmUser = users.find((u) => u.role === "gm");
  const fomUser = users.find((u) => u.role === "fom");
  const fbMgrUser = users.find((u) => u.role === "fb_mgr");
  const engMgr = users.find((u) => u.role === "eng_mgr");

  const events = [
    {
      title: "Diwali Celebration",
      description: "Annual Diwali celebration with cultural programs, rangoli competition, and dinner for all staff and families.",
      type: "festival",
      eventDate: setMinutes(setHours(addDays(now, randInt(5, 15)), 18), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(5, 15)), 22), 0),
      venue: "Grand Ballroom",
      organizerId: hrMgr?.id ?? null,
      status: "upcoming",
    },
    {
      title: "New Year Party",
      description: "Welcome the new year with music, dance, and gourmet dinner. Dress code: Formal/Semi-formal.",
      type: "celebration",
      eventDate: setMinutes(setHours(addDays(now, randInt(20, 30)), 19), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(20, 30)), 23), 30),
      venue: "Rooftop Terrace",
      organizerId: gmUser?.id ?? null,
      status: "upcoming",
    },
    {
      title: "Fire Safety Training",
      description: "Mandatory fire safety and evacuation drill for all departments. Covers fire extinguisher usage, emergency exits, and assembly points.",
      type: "training",
      eventDate: setMinutes(setHours(subDays(now, randInt(5, 10)), 10), 0),
      endDate: setMinutes(setHours(subDays(now, randInt(5, 10)), 13), 0),
      venue: "Conference Room A",
      organizerId: engMgr?.id ?? null,
      status: "completed",
    },
    {
      title: "Quarterly Review Meeting",
      description: "Q1 performance review with department heads. P&L discussion, KPIs review, and strategic planning for next quarter.",
      type: "meeting",
      eventDate: setMinutes(setHours(addDays(now, randInt(2, 5)), 14), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(2, 5)), 17), 0),
      venue: "Board Room",
      organizerId: gmUser?.id ?? null,
      status: "upcoming",
    },
    {
      title: "Republic Day Celebration",
      description: "Flag hoisting ceremony followed by cultural programs and patriotic songs. All staff requested to attend in formal attire.",
      type: "festival",
      eventDate: setMinutes(setHours(addDays(now, randInt(15, 25)), 9), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(15, 25)), 12), 0),
      venue: "Main Lawn",
      organizerId: hrMgr?.id ?? null,
      status: "upcoming",
    },
    {
      title: "Holi Celebration",
      description: "Holi festival celebration with colors, snacks, and music. Safe organic colors will be provided. Dress code: White.",
      type: "festival",
      eventDate: setMinutes(setHours(addDays(now, randInt(30, 45)), 10), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(30, 45)), 14), 0),
      venue: "Poolside Area",
      organizerId: hrMgr?.id ?? null,
      status: "upcoming",
    },
    {
      title: "Food Safety Audit",
      description: "Internal food safety and hygiene audit across all F&B outlets. Inspection of kitchen facilities, storage, and food handling practices.",
      type: "audit",
      eventDate: setMinutes(setHours(subDays(now, randInt(1, 3)), 9), 0),
      endDate: setMinutes(setHours(subDays(now, randInt(1, 3)), 17), 0),
      venue: "All F&B Outlets",
      organizerId: fbMgrUser?.id ?? null,
      status: "ongoing",
    },
    {
      title: "Team Building Workshop",
      description: "Interactive team building activities including trust exercises, problem-solving challenges, and collaborative games.",
      type: "training",
      eventDate: setMinutes(setHours(addDays(now, randInt(7, 14)), 9), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(7, 14)), 17), 0),
      venue: "Outdoor Pavilion",
      organizerId: hrMgr?.id ?? null,
      status: "upcoming",
    },
    {
      title: "Customer Service Training",
      description: "Advanced customer service excellence training for front-line staff. Covers guest handling, complaint resolution, and service recovery.",
      type: "training",
      eventDate: setMinutes(setHours(subDays(now, randInt(10, 20)), 10), 0),
      endDate: setMinutes(setHours(subDays(now, randInt(10, 20)), 16), 0),
      venue: "Training Room B",
      organizerId: fomUser?.id ?? null,
      status: "completed",
    },
    {
      title: "Annual Day",
      description: "Annual day celebration with award ceremony, staff performances, and dinner. Recognizing outstanding employees across all departments.",
      type: "celebration",
      eventDate: setMinutes(setHours(addDays(now, randInt(40, 60)), 17), 0),
      endDate: setMinutes(setHours(addDays(now, randInt(40, 60)), 22), 0),
      venue: "Grand Ballroom",
      organizerId: gmUser?.id ?? null,
      status: "upcoming",
    },
  ];

  for (const evt of events) {
    await db.companyEvent.create({
      data: {
        propertyId,
        title: evt.title,
        description: evt.description,
        type: evt.type,
        eventDate: evt.eventDate,
        endDate: evt.endDate,
        venue: evt.venue,
        organizerId: evt.organizerId,
        status: evt.status,
      },
    });
  }
  console.log(`    ✅ Created ${events.length} company events`);

  // ══════════════════════════════════════════════════════════════
  // 4. SCORECARDS
  // ══════════════════════════════════════════════════════════════
  console.log("  📊 Generating scorecards...");

  const scorecardData: Array<{
    propertyId: string;
    userId: string;
    period: string;
    attendance: number;
    punctuality: number;
    taskCompletion: number;
    guestFeedback: number;
    teamwork: number;
    initiative: number;
    grooming: number;
    communication: number;
    overallScore: number;
    grade: string;
    remarks: string | null;
    reviewedBy: string | null;
  }> = [];

  const owner = users.find((u) => u.role === "owner");

  for (const user of users) {
    // Managers get higher scores (7-9 range), staff moderate (5-8 range)
    const isManager = user.roleLevel <= 3;
    const isTop = user.roleLevel <= 2;

    const scoreRange = isTop
      ? { min: 7.5, max: 9.5 }
      : isManager
        ? { min: 7, max: 9 }
        : { min: 5, max: 8 };

    // Attendance percentage based on actual attendance data
    const workedDays = attendanceCounts[user.id].present + attendanceCounts[user.id].late + (attendanceCounts[user.id].halfDay * 0.5);
    const attendancePct = pastWorkingDays.length > 0
      ? parseFloat(((workedDays / pastWorkingDays.length) * 100).toFixed(1))
      : 80;

    const punctuality = randFloat(scoreRange.min, scoreRange.max);
    const taskCompletion = randFloat(isManager ? 75 : 60, isManager ? 98 : 95);
    const guestFeedback = randFloat(scoreRange.min, scoreRange.max);
    const teamwork = randFloat(scoreRange.min, scoreRange.max);
    const initiative = randFloat(isTop ? 8 : scoreRange.min, scoreRange.max);
    const grooming = randFloat(scoreRange.min, 10);
    const communication = randFloat(scoreRange.min, scoreRange.max);

    // Overall score: weighted average out of 100
    // Attendance: 15%, Punctuality: 10%, Task Completion: 20%, Guest Feedback: 15%,
    // Teamwork: 10%, Initiative: 10%, Grooming: 10%, Communication: 10%
    const overallScore = parseFloat(
      (
        (attendancePct * 0.15) +
        ((punctuality / 10) * 100 * 0.10) +
        (taskCompletion * 0.20) +
        ((guestFeedback / 10) * 100 * 0.15) +
        ((teamwork / 10) * 100 * 0.10) +
        ((initiative / 10) * 100 * 0.10) +
        ((grooming / 10) * 100 * 0.10) +
        ((communication / 10) * 100 * 0.10)
      ).toFixed(2)
    );

    // Grade based on overallScore
    let grade: string;
    if (overallScore >= 90) grade = "A+";
    else if (overallScore >= 80) grade = "A";
    else if (overallScore >= 70) grade = "B+";
    else if (overallScore >= 60) grade = "B";
    else if (overallScore >= 50) grade = "C";
    else grade = "D";

    // Remarks
    let remarks: string | null = null;
    if (grade === "A+" || grade === "A") remarks = "Excellent performance";
    else if (grade === "B+" || grade === "B") remarks = "Good performance, room for improvement";
    else if (grade === "C") remarks = "Satisfactory, needs improvement in key areas";
    else remarks = "Below expectations, improvement plan recommended";

    // Reviewed by: owner for top (owner/GM), GM for managers, HR manager for staff
    let reviewedBy: string | null = null;
    if (isTop) reviewedBy = owner?.id ?? null;
    else if (isManager) reviewedBy = gmUser?.id ?? null;
    else reviewedBy = hrMgr?.id ?? null;

    scorecardData.push({
      propertyId,
      userId: user.id,
      period,
      attendance: attendancePct,
      punctuality,
      taskCompletion,
      guestFeedback,
      teamwork,
      initiative,
      grooming,
      communication,
      overallScore,
      grade,
      remarks,
      reviewedBy,
    });
  }

  await db.scorecard.createMany({ data: scorecardData });
  console.log(`    ✅ Created ${scorecardData.length} scorecards`);

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log("\n  🌱 HR Seed Summary:");
  console.log(`     Attendance records : ${attendanceData.length}`);
  console.log(`     Payroll records    : ${payrollData.length}`);
  console.log(`     Company events     : ${events.length}`);
  console.log(`     Scorecards         : ${scorecardData.length}`);
  console.log("\n  ✅ HR data seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
