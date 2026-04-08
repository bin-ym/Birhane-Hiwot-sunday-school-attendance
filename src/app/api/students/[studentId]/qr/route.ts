import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    if (!studentId || !ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { error: "Valid ID is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const student = await db
      .collection("students")
      .findOne(
        { _id: new ObjectId(studentId) },
        { projection: { qr_code: 1 } },
      );

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.qr_code) {
      return NextResponse.json(
        { error: "QR code not found for this student" },
        { status: 404 },
      );
    }

    // The qr_code is stored as a base64 data URL: data:image/png;base64,iVBORw0KGgo...
    const base64Data = student.qr_code.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
