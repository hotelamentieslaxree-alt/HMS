// Auth — Get current user
import { db, ensureDbReady } from "@/lib/db";
import { ok, fail } from "@/lib/hms";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Ensure DB is ready on Vercel serverless
    await ensureDbReady();
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return fail("Not authenticated", "AUTH_REQUIRED", 401);
    }

    // Simple token decode for demo (token = base64(userId:timestamp))
    const token = authHeader.replace("Bearer ", "");
    const decoded = Buffer.from(token, "base64").toString();
    const userId = decoded.split(":")[0];

    if (!userId) {
      return fail("Invalid token", "AUTH_INVALID", 401);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        property: { select: { id: true, name: true, code: true, businessDate: true } },
      },
    });

    if (!user || !user.isActive) {
      return fail("User not found or inactive", "AUTH_INVALID", 401);
    }

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roleLevel: user.roleLevel,
      employeeCode: user.employeeCode,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      property: user.property,
    };

    return ok(userData);
  } catch (e: any) {
    return fail(e.message || "Auth check failed", "AUTH_ERROR", 500);
  }
}
