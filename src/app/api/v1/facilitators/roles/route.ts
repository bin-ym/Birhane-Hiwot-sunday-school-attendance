// src/app/api/facilitators/roles/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const roles = [
    { value: "Attendance Facilitator", label: "Attendance Facilitator" },
    { value: "Education Facilitator", label: "Education Facilitator" },
  ];

  return NextResponse.json(roles, { status: 200 });
}
