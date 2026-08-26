import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sanitizeError } from "@/lib/apiAuth";

const SETUP_CONFIRM_TEXT = "CREATE_SUPER_ADMIN";

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes (setup is already guarded by confirmation text)
  const rl = await enforceRateLimit(req, { maxRequests: 10, windowMs: 15 * 60_000, keyPrefix: "setup" });
  if (rl) return rl;

  try {
    const body = await req.json();
    const name = String(body?.name || "Super Admin");
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const confirm = String(body?.confirm || "");

    if (confirm !== SETUP_CONFIRM_TEXT) {
      return NextResponse.json(
        { error: "Setup confirmation is invalid" },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Stronger password policy: min 8 chars, uppercase, lowercase, number
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must include uppercase, lowercase, and a number" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const superAdminExists = await users.findOne({ role: "Super Admin" });
    if (superAdminExists) {
      return NextResponse.json(
        { message: "Super Admin already exists", created: false },
        { status: 200 }
      );
    }

    const emailExists = await users.findOne({ email });
    if (emailExists) {
      return NextResponse.json(
        {
          error:
            "Email already exists with another account. Use a different email.",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await users.insertOne({
      name,
      email,
      password: hashedPassword,
      role: "Super Admin",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        message: "Super Admin created successfully",
        created: true,
        userId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err) },
      { status: 500 }
    );
  }
}
