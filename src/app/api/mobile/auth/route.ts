// src/app/api/mobile/auth/route.ts
// Mobile app login endpoint — returns a simple JWT + user object
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getDb } from "@/lib/mongodb";
import { User } from "@/lib/models";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const userFromDb = await db.collection<User>("users").findOne({
      email: { $regex: new RegExp(`^${escapeRegex(email.trim())}$`, "i") },
    });

    if (!userFromDb) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const passwordsMatch = await bcrypt.compare(password, userFromDb.password);

    if (!passwordsMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "mobile-secret-fallback",
    );

    // Create a JWT for the mobile app (7 day expiry)
    const token = await new SignJWT({
      sub: userFromDb._id!.toString(),
      email: userFromDb.email,
      role: userFromDb.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: userFromDb._id!.toString(),
        email: userFromDb.email,
        name: userFromDb.name || "",
        role: userFromDb.role,
        grade: userFromDb.grade,
      },
    }, { headers: corsHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 },
    );
  }
}
