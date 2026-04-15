import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

const SETUP_CONFIRM_TEXT = "CREATE_SUPER_ADMIN";

export async function POST(req: NextRequest) {
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to run super admin setup" },
      { status: 500 }
    );
  }
}
