// src/app/api/cron/aggregate-attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aggregateAttendance } from "@/lib/aggregateAttendance";
import { formatEthiopianDate } from "@/lib/utils";
import { sanitizeError } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    // Require CRON_SECRET header to prevent public access.
    // Allow localhost in development for testing convenience.
    const cronSecret = req.headers.get("x-cron-secret");
    const isLocalhost = req.headers.get("host")?.startsWith("localhost");
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev && (!cronSecret || cronSecret !== process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const date = url.searchParams.get("date") || formatEthiopianDate(new Date());
    const result = await aggregateAttendance(date);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}