// /api/hr/scorecards — Employee performance scorecards
import { db } from "@/lib/db";
import { ok, fail, parseBody, PROPERTY_ID, withHandler } from "@/lib/hms";

export const dynamic = "force-dynamic";

// ── Weighted score calculation ──────────────────────────────────────────────────
// Weights: attendance 15%, punctuality 10%, taskCompletion 20%, guestFeedback 15%,
//          teamwork 10%, initiative 10%, grooming 10%, communication 10%
// 0-10 metrics are normalized to 0-100 (×10) before weighting so the result is 0-100.
function calcOverallScore(s: {
  attendance: number;
  punctuality: number;
  taskCompletion: number;
  guestFeedback: number;
  teamwork: number;
  initiative: number;
  grooming: number;
  communication: number;
}): number {
  const raw =
    s.attendance * 0.15 +
    s.punctuality * 10 * 0.10 +
    s.taskCompletion * 0.20 +
    s.guestFeedback * 10 * 0.15 +
    s.teamwork * 10 * 0.10 +
    s.initiative * 10 * 0.10 +
    s.grooming * 10 * 0.10 +
    s.communication * 10 * 0.10;
  return Math.round(raw * 100) / 100;
}

function calcGrade(overallScore: number): string {
  if (overallScore >= 90) return "A+";
  if (overallScore >= 80) return "A";
  if (overallScore >= 70) return "B+";
  if (overallScore >= 60) return "B";
  if (overallScore >= 50) return "C";
  return "D";
}

// ── GET: list scorecards for a period with department averages ──────────────────
export const GET = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const url = new URL(req.url);

  const period = url.searchParams.get("period");
  const userId = url.searchParams.get("userId");

  if (!period) return fail("period query parameter is required (e.g. 2025-01 or 2024-Q1)", "VALIDATION");

  const where: any = { propertyId, period };
  if (userId) where.userId = userId;

  const scorecards = await db.scorecard.findMany({
    where,
    include: {
      user: { include: { department: true } },
    },
    orderBy: [{ overallScore: "desc" }],
  });

  // Department averages & overall stats
  const deptMap: Record<string, { scores: number[]; count: number }> = {};
  let totalScore = 0;
  const gradeCounts: Record<string, number> = {};

  for (const sc of scorecards) {
    totalScore += sc.overallScore;
    gradeCounts[sc.grade] = (gradeCounts[sc.grade] || 0) + 1;

    const deptName = sc.user?.department?.name || "Unassigned";
    if (!deptMap[deptName]) deptMap[deptName] = { scores: [], count: 0 };
    deptMap[deptName].scores.push(sc.overallScore);
    deptMap[deptName].count++;
  }

  const departmentAverages: Record<string, { average: number; count: number }> = {};
  for (const [dept, data] of Object.entries(deptMap)) {
    const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    departmentAverages[dept] = { average: Math.round(avg * 100) / 100, count: data.count };
  }

  const overallStats = {
    averageScore: scorecards.length > 0 ? Math.round((totalScore / scorecards.length) * 100) / 100 : 0,
    totalEmployees: scorecards.length,
    byGrade: gradeCounts,
  };

  return ok({
    overallStats,
    departmentAverages,
    scorecards: scorecards.map((sc) => ({
      id: sc.id,
      period: sc.period,
      userId: sc.userId,
      userName: sc.user ? `${sc.user.firstName} ${sc.user.lastName}` : null,
      department: sc.user?.department?.name ?? null,
      departmentCode: sc.user?.department?.code ?? null,
      attendance: sc.attendance,
      punctuality: sc.punctuality,
      taskCompletion: sc.taskCompletion,
      guestFeedback: sc.guestFeedback,
      teamwork: sc.teamwork,
      initiative: sc.initiative,
      grooming: sc.grooming,
      communication: sc.communication,
      overallScore: sc.overallScore,
      grade: sc.grade,
      remarks: sc.remarks,
      reviewedBy: sc.reviewedBy,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
    })),
  });
});

// ── POST: upsert scorecard (auto-calculate overallScore & grade) ────────────────
export const POST = withHandler(async (req: Request) => {
  const propertyId = await PROPERTY_ID();
  const body = await parseBody(req);

  const {
    userId,
    period,
    attendance = 0,
    punctuality = 0,
    taskCompletion = 0,
    guestFeedback = 0,
    teamwork = 0,
    initiative = 0,
    grooming = 0,
    communication = 0,
    remarks,
    reviewedBy,
  } = body;

  if (!userId) return fail("userId is required", "VALIDATION");
  if (!period) return fail("period is required (e.g. 2025-01 or 2024-Q1)", "VALIDATION");

  // Validate ranges
  if (attendance < 0 || attendance > 100) return fail("attendance must be 0-100", "VALIDATION");
  if (punctuality < 0 || punctuality > 10) return fail("punctuality must be 0-10", "VALIDATION");
  if (taskCompletion < 0 || taskCompletion > 100) return fail("taskCompletion must be 0-100", "VALIDATION");
  if (guestFeedback < 0 || guestFeedback > 10) return fail("guestFeedback must be 0-10", "VALIDATION");
  if (teamwork < 0 || teamwork > 10) return fail("teamwork must be 0-10", "VALIDATION");
  if (initiative < 0 || initiative > 10) return fail("initiative must be 0-10", "VALIDATION");
  if (grooming < 0 || grooming > 10) return fail("grooming must be 0-10", "VALIDATION");
  if (communication < 0 || communication > 10) return fail("communication must be 0-10", "VALIDATION");

  const overallScore = calcOverallScore({
    attendance,
    punctuality,
    taskCompletion,
    guestFeedback,
    teamwork,
    initiative,
    grooming,
    communication,
  });
  const grade = calcGrade(overallScore);

  const scorecard = await db.scorecard.upsert({
    where: { userId_period: { userId, period } },
    update: {
      attendance,
      punctuality,
      taskCompletion,
      guestFeedback,
      teamwork,
      initiative,
      grooming,
      communication,
      overallScore,
      grade,
      remarks: remarks || null,
      reviewedBy: reviewedBy || null,
    },
    create: {
      propertyId,
      userId,
      period,
      attendance,
      punctuality,
      taskCompletion,
      guestFeedback,
      teamwork,
      initiative,
      grooming,
      communication,
      overallScore,
      grade,
      remarks: remarks || null,
      reviewedBy: reviewedBy || null,
    },
    include: {
      user: { include: { department: true } },
    },
  });

  return ok({
    id: scorecard.id,
    period: scorecard.period,
    userId: scorecard.userId,
    userName: scorecard.user ? `${scorecard.user.firstName} ${scorecard.user.lastName}` : null,
    department: scorecard.user?.department?.name ?? null,
    attendance: scorecard.attendance,
    punctuality: scorecard.punctuality,
    taskCompletion: scorecard.taskCompletion,
    guestFeedback: scorecard.guestFeedback,
    teamwork: scorecard.teamwork,
    initiative: scorecard.initiative,
    grooming: scorecard.grooming,
    communication: scorecard.communication,
    overallScore: scorecard.overallScore,
    grade: scorecard.grade,
    remarks: scorecard.remarks,
    reviewedBy: scorecard.reviewedBy,
    createdAt: scorecard.createdAt,
    updatedAt: scorecard.updatedAt,
  });
});
