// Auth — Login
import { db, ensureDbReady } from "@/lib/db";
import { ok, fail, PROPERTY_ID } from "@/lib/hms";
import { NextRequest } from "next/server";

// Demo password for all users — in production use bcrypt
const DEMO_PASSWORD = "aurelian2024";

export async function POST(req: NextRequest) {
  try {
    // Ensure DB is ready on Vercel serverless and trigger auto-seed if empty
    await ensureDbReady();
    await PROPERTY_ID(); // triggers ensureProperty → seedDemoData on first run

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return fail("Email and password are required", "VALIDATION", 400);
    }

    // Verify password (demo: all users share one password)
    if (password !== DEMO_PASSWORD) {
      return fail("Invalid email or password", "AUTH_INVALID", 401);
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        department: true,
        property: { select: { id: true, name: true, code: true, businessDate: true } },
      },
    });

    // Schema uses `isActive` (Boolean), not `status` (String)
    if (!user || !user.isActive) {
      return fail("Invalid email or password", "AUTH_INVALID", 401);
    }

    // Return user + token (simple base64 token for demo)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roleLevel: user.roleLevel || 1,
      employeeCode: user.employeeCode || "",
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      property: user.property,
      token,
    };

    return ok(userData);
  } catch (e: any) {
    return fail(e.message || "Login failed", "AUTH_ERROR", 500);
  }
}
