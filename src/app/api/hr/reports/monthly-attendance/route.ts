import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ETHIOPIAN_MONTHS } from "@/lib/utils";
import { requireRole, sanitizeError } from "@/lib/apiAuth";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, "Super Admin", "HR Admin");
  if (error) return error;

  const academicYear = req.nextUrl.searchParams.get("academicYear") || "";
  const monthNumber = Number(req.nextUrl.searchParams.get("month"));
  if (!/^\d{4}$/.test(academicYear) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 13) {
    return NextResponse.json(
      { error: "A valid academicYear and Ethiopian month are required" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const month = ETHIOPIAN_MONTHS[monthNumber - 1];
    const students = await db
      .collection("students")
      .find(
        { Academic_Year: { $regex: `^${academicYear}(?:\\s|$)` } },
        {
          projection: {
            Unique_ID: 1,
            First_Name: 1,
            Father_Name: 1,
            Grade: 1,
            Classification: 1,
          },
        },
      )
      .toArray();

    const studentIds = students.map((student) => student._id.toString());
    const [attendance, payments] = studentIds.length
      ? await Promise.all([
          db
            .collection("attendance")
            .find({
              studentId: { $in: studentIds },
              $or: [
                {
                  date: {
                    $regex: new RegExp(
                      `\\s${escapeRegex(month)}\\s${academicYear}$`,
                      "i",
                    ),
                  },
                },
                {
                  date: {
                    $regex: `^${academicYear}-${String(monthNumber).padStart(2, "0")}-`,
                  },
                },
              ],
            })
            .toArray(),
          db
            .collection("payment_status")
            .find({ academicYear, studentId: { $in: studentIds } })
            .toArray(),
        ])
      : [[], []];

    const attendanceByStudent = new Map<
      string,
      { presentDays: number; absentDays: number }
    >();
    for (const record of attendance) {
      const counts = attendanceByStudent.get(record.studentId) || {
        presentDays: 0,
        absentDays: 0,
      };
      if (record.present) counts.presentDays += 1;
      else counts.absentDays += 1;
      attendanceByStudent.set(record.studentId, counts);
    }

    const paymentByStudent = new Map(payments.map((record) => [record.studentId, record]));
    const rows = students.map((student) => {
      const studentId = student._id.toString();
      const attendanceCounts = attendanceByStudent.get(studentId) || {
        presentDays: 0,
        absentDays: 0,
      };
      const monthPayment = paymentByStudent.get(studentId)?.data?.[month];
      const paymentStatus =
        typeof monthPayment === "string"
          ? monthPayment
          : monthPayment?.status || "Not Paid";

      return {
        studentId,
        uniqueId: student.Unique_ID || "",
        name: [student.First_Name, student.Father_Name].filter(Boolean).join(" "),
        grade: student.Grade || "",
        classification: student.Classification || "Regular",
        presentDays: attendanceCounts.presentDays,
        absentDays: attendanceCounts.absentDays,
        paymentStatus,
        paymentAmount:
          typeof monthPayment === "object" && monthPayment !== null
            ? monthPayment.amount || ""
            : "",
      };
    });

    rows.sort(
      (left, right) =>
        right.absentDays - left.absentDays || left.name.localeCompare(right.name),
    );

    return NextResponse.json(
      {
        academicYear,
        month,
        totals: {
          students: rows.length,
          presentDays: rows.reduce((sum, row) => sum + row.presentDays, 0),
          absentDays: rows.reduce((sum, row) => sum + row.absentDays, 0),
          absentThreeOrMore: rows.filter((row) => row.absentDays >= 3).length,
          unpaidStudents: rows.filter((row) => row.paymentStatus !== "Paid").length,
        },
        students: rows,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}