// src/app/api/category-periods/route.ts

import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { CategoryPeriod } from "@/lib/models";
import { requireAuth, requireSuperAdmin } from "@/lib/apiAuth";

// GET — fetch all periods (optionally filtered by academicYear)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear");

    const filter: any = {};
    if (academicYear) filter.academicYear = academicYear;

    const periods = await db
      .collection<CategoryPeriod>("category_periods")
      .find(filter)
      .sort({ classification: 1 })
      .toArray();

    return NextResponse.json(periods, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch category periods" },
      { status: 500 },
    );
  }
}

function validatePeriodDates(
  startDate?: string,
  endDate?: string,
  registrationClosedDate?: string,
  classification?: string,
): string | null {
  const s = String(startDate || "").trim();
  const e = String(endDate || "").trim();
  const c = String(registrationClosedDate || "").trim();

  if (s && e && s > e) {
    return `${classification ? `${classification}: ` : ""}Start Date must be on or before End Date`;
  }
  if (e && c && e > c) {
    return `${classification ? `${classification}: ` : ""}Registration Closed Date must be on or after End Date`;
  }
  if (s && c && s > c) {
    return `${classification ? `${classification}: ` : ""}Start Date must be on or before Registration Closed Date`;
  }
  return null;
}

// POST — create or update period(s) for a classification + academicYear
// Supports single object (backward-compatible) or an array of periods (atomic batch update)
export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const rawBody = await req.json();

    const items: Array<Omit<CategoryPeriod, "_id" | "createdAt" | "updatedAt">> =
      Array.isArray(rawBody)
        ? rawBody
        : Array.isArray(rawBody?.periods)
        ? rawBody.periods
        : [rawBody];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No period data provided" },
        { status: 400 },
      );
    }

    // Validate all items before writing
    for (const item of items) {
      if (!item.classification || !item.academicYear) {
        return NextResponse.json(
          { error: "classification and academicYear are required" },
          { status: 400 },
        );
      }

      const dateError = validatePeriodDates(
        item.startDate,
        item.endDate,
        item.registrationClosedDate,
        item.classification,
      );
      if (dateError) {
        return NextResponse.json({ error: dateError }, { status: 400 });
      }
    }

    const db = await getDb();
    const collection = db.collection<CategoryPeriod>("category_periods");
    const now = new Date();

    // Single item handling (backward-compatible return format)
    if (items.length === 1 && !Array.isArray(rawBody) && !Array.isArray(rawBody?.periods)) {
      const body = items[0];
      const result = await collection.findOneAndUpdate(
        {
          classification: body.classification,
          academicYear: body.academicYear,
        },
        {
          $set: {
            startDate: body.startDate || "",
            endDate: body.endDate || "",
            registrationClosedDate: body.registrationClosedDate || "",
            isActive: body.isActive ?? true,
            updatedAt: now,
          },
          $setOnInsert: {
            classification: body.classification,
            academicYear: body.academicYear,
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      return NextResponse.json(result, { status: 200 });
    }

    // Atomic batch upsert with bulkWrite
    const operations = items.map((body) => ({
      updateOne: {
        filter: {
          classification: body.classification,
          academicYear: body.academicYear,
        },
        update: {
          $set: {
            startDate: body.startDate || "",
            endDate: body.endDate || "",
            registrationClosedDate: body.registrationClosedDate || "",
            isActive: body.isActive ?? true,
            updatedAt: now,
          },
          $setOnInsert: {
            classification: body.classification,
            academicYear: body.academicYear,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations);

    return NextResponse.json(
      {
        message: `Successfully saved ${items.length} category periods`,
        count: items.length,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save category period(s)" },
      { status: 500 },
    );
  }
}
