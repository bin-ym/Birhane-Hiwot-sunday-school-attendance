// src/app/api/mobile/auth/route.ts
// Mobile app login endpoint — returns a simple JWT + user object
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getDb } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400, headers: cors },
      );
    }

    const db = await getDb();
    const userFromDb = await db.collection<User>("users").findOne({
      email: { $regex: new RegExp(`^${escapeRegex(email.trim())}$`, "i") },
    });

    if (!userFromDb) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401, headers: cors },
      );
    }

    const passwordsMatch = await bcrypt.compare(password, userFromDb.password);

    if (!passwordsMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401, headers: cors },
      );
    }

    if (!process.env.NEXTAUTH_SECRET) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500, headers: cors },
      );
    }
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    // Create a JWT for the mobile app (7 day expiry)
    const token = await new SignJWT({
      sub: userFromDb._id!.toString(),
      email: userFromDb.email,
      role: userFromDb.role,
      name: userFromDb.name || "",
      grade: userFromDb.grade,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json(
      {
        token,
        user: {
          id: userFromDb._id!.toString(),
          email: userFromDb.email,
          name: userFromDb.name || "",
          role: userFromDb.role,
          grade: userFromDb.grade,
        },
      },
      { headers: cors },
    );
  } catch {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500, headers: cors },
    );
  }
}

