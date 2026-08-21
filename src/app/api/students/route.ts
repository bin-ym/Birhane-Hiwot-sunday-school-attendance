// src/app/api/students/route.ts
import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { Student, UserRole } from "@/lib/models";
import { createSignedQrText } from "@/lib/qr";
import { withLock } from "@/lib/distributedLock";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const grades = searchParams.getAll("grade");
    const uniqueId = searchParams.get("uniqueId");
    const limitParam = searchParams.get("limit");
    const academicYear = searchParams.get("academicYear");
    const sex = searchParams.get("sex");

    const query: any = {};

    if (academicYear) query.Academic_Year = academicYear;
    if (sex) query.Sex = sex;

    if (uniqueId) {
      const student = await db.collection<Student>("students").findOne(
        { Unique_ID: uniqueId },
        { projection: { photo_data_url: 0, qr_code: 0 } },
      );
      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          ...student,
          _id: student._id.toString(),
        },
        { status: 200 },
      );
    }

    if (grades && grades.length > 0) {
      query.Grade = { $in: grades };
    }

    // Build find with projection to exclude large fields not needed for listings
    let find = db
      .collection<Student>("students")
      .find(query, { projection: { photo_data_url: 0, qr_code: 0 } })
      .sort({ _id: -1 });

    // Optional limit parameter for pagination
    const limit = parseInt(limitParam || "0", 10);
    if (limit > 0) {
      find = find.limit(limit);
    }

    const students = await find.toArray();

    const serializedStudents = students.map((student) => ({
      ...student,
      _id: student._id.toString(),
    }));

    return NextResponse.json(serializedStudents, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body: Omit<Student, "_id"> & {
      userRole?: UserRole;
      userEmail?: string;
    } = await req.json();
    const userRole = body.userRole || "Admin";
    const userEmail = body.userEmail?.trim();

    const requiredFields = [
      "Unique_ID",
      "First_Name",
      "Father_Name",
      "Academic_Year",
      "Grade",
    ];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Photo validation (required for new students on the UI, enforced here too)
    if (body.photo_data_url) {
      const p = body.photo_data_url;
      const ok =
        typeof p === "string" &&
        (p.startsWith("data:image/jpeg;base64,") ||
          p.startsWith("data:image/png;base64,"));
      if (!ok) {
        return NextResponse.json(
          { error: "photo_data_url must be a JPG or PNG data URL" },
          { status: 400 },
        );
      }
    }

    // Distributed lock on the Unique_ID so concurrent creates can't both pass
    // the existence check and insert duplicates. Gracefully no-ops without Redis.
    const lockKey = `lock:student:${body.Unique_ID}`;
    return withLock(
      lockKey,
      async () => {
        // Check if this is a new student by seeing if Unique_ID already exists
        const existingStudent = await db.collection("students").findOne({
          Unique_ID: body.Unique_ID,
        });

        const isNewStudent = !existingStudent;

        const adminRoles: UserRole[] = ["Admin", "Super Admin", "HR Admin"];

        if (userRole === "Attendance Facilitator" && isNewStudent) {
          if (!userEmail) {
            return NextResponse.json(
              { error: "User email is required for facilitator student creation." },
              { status: 403 },
            );
          }

          const facilitator = await db.collection("users").findOne({
            email: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          });

          if (!facilitator?.canAddStudent) {
            return NextResponse.json(
              {
                error:
                  "You do not have permission to add students. Contact HR to enable this.",
                code: "ADD_STUDENT_DENIED",
              },
              { status: 403 },
            );
          }

          const assignedGrades = Array.isArray(facilitator.grade)
            ? facilitator.grade
            : facilitator.grade
              ? [facilitator.grade]
              : [];

          if (assignedGrades.length > 0 && !assignedGrades.includes(body.Grade)) {
            return NextResponse.json(
              {
                error: `You can only add students to your assigned grade(s): ${assignedGrades.join(", ")}`,
                code: "RESTRICTED_GRADE",
              },
              { status: 403 },
            );
          }
        } else if (isNewStudent && !adminRoles.includes(userRole)) {
          return NextResponse.json(
            { error: "You do not have permission to add students." },
            { status: 403 },
          );
        }

        // Remove client-only fields before insert
        delete (body as { userRole?: UserRole }).userRole;
        delete (body as { userEmail?: string }).userEmail;

        // ✅ Generate QR Code for the student
        try {
          const qrText = createSignedQrText(body.Unique_ID);
          const QRCode = await import("qrcode");
          body.qr_code = await QRCode.toDataURL(qrText);
        } catch (qrError) {
          console.error("Failed to generate QR code:", qrError);
          // ✅ Do NOT block student creation if QR_SECRET is missing or QR fails.
          // Student will be created, but QR scanning will not work until QR_SECRET is set.
          delete (body as any).qr_code;
        }

        const result = await db.collection("students").insertOne(body as Student);
        return NextResponse.json(
          { _id: result.insertedId.toString() },
          { status: 201 },
        );
      },
      { ttlMs: 15_000, waitMs: 10_000 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { id } = await req.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid ID is required" },
        { status: 400 },
      );
    }

    const result = await db
      .collection<Student>("students")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Student deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
