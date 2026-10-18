import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin, sanitizeError } from "@/lib/apiAuth";
import { createSignedQrText } from "@/lib/qr";
import { Student } from "@/lib/models";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const db = await getDb();
    const totalStudents = await db.collection("students").countDocuments();
    const studentsWithQr = await db.collection("students").countDocuments({
      qr_code: { $exists: true, $ne: "" },
    });
    const studentsMissingQr = totalStudents - studentsWithQr;

    return NextResponse.json({
      totalStudents,
      studentsWithQr,
      studentsMissingQr,
      allReady: studentsMissingQr === 0,
    });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));
    const forceAll = body?.force === true;

    const query: any = forceAll
      ? {}
      : {
          $or: [
            { qr_code: { $exists: false } },
            { qr_code: "" },
            { qr_code: { $type: "null" } },
          ],
        };

    const students = await db
      .collection<Student>("students")
      .find(query, { projection: { _id: 1, Unique_ID: 1, First_Name: 1 } })
      .toArray();

    if (students.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "All students already have valid QR codes",
        processed: 0,
        updated: 0,
      });
    }

    const QRCode = await import("qrcode");
    let updatedCount = 0;
    const errors: string[] = [];

    for (const student of students) {
      if (!student.Unique_ID) {
        errors.push(`Student ${student._id.toString()} missing Unique_ID`);
        continue;
      }

      try {
        const qrText = createSignedQrText(student.Unique_ID);
        const qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 400,
          margin: 1,
          errorCorrectionLevel: "M",
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        await db.collection("students").updateOne(
          { _id: student._id },
          { $set: { qr_code: qrDataUrl, updatedAt: new Date() } },
        );
        updatedCount++;
      } catch (err) {
        errors.push(`Failed for ${student.Unique_ID}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Batch QR generation complete: ${updatedCount} updated`,
      processed: students.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
