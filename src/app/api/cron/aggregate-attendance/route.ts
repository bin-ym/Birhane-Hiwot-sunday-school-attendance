// src/app/api/cron/aggregate-attendance/route.ts

import { NextRequest, NextResponse } from "next/server";
import { aggregateAttendance } from "@/lib/aggregateAttendance";
import { formatEthiopianDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || formatEthiopianDate(new Date());
    const result = await aggregateAttendance(date);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}