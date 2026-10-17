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

// POST — create or update a period for a classification + academicYear
export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const body: any = await req.json();

    if (!body.classification || !body.academicYear) {
      return NextResponse.json(
        { error: "classification and academicYear are required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection<CategoryPeriod>("category_periods");
    const now = new Date();

    const targetId = body._id || body.id;
    if (targetId && ObjectId.isValid(targetId)) {
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(targetId) },
        {
          $set: {
            classification: body.classification,
            academicYear: String(body.academicYear).trim(),
            startDate: body.startDate || "",
            endDate: body.endDate || "",
            registrationClosedDate: body.registrationClosedDate || "",
            isActive: body.isActive ?? true,
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );
      return NextResponse.json(result, { status: 200 });
    }

    // Upsert: one period per classification + academicYear
    const result = await collection.findOneAndUpdate(
      {
        classification: body.classification,
        academicYear: String(body.academicYear).trim(),
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
          academicYear: String(body.academicYear).trim(),
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save category period" },
      { status: 500 },
    );
  }
}

// DELETE — delete a registration period by ID
export async function DELETE(req: NextRequest) {
  const { error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?._id;
      } catch {
        // body parsing optional
      }
    }

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid registration period ID is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const result = await db
      .collection<CategoryPeriod>("category_periods")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Registration period not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Registration period deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete category period" },
      { status: 500 },
    );
  }
}
