// Auth — Login
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/hms";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

// Demo password for all users — in production use bcrypt
const DEMO_PASSWORD = "aurelian2024";
const PASSWORD_SALT = "aria_hms_salt";

function hashPassword(password: string): string {
  return createHmac("sha256", PASSWORD_SALT).update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return fail("Email and password are required", "VALIDATION", 400);
    }

    // Verify password
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
      roleLevel: user.roleLevel,
      employeeCode: user.employeeCode,
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
