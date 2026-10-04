import { createSignedQrText } from "@/lib/qr";
import { isCategoryRegistrationOpen } from "@/lib/utils";
import type { CategoryPeriod, Student, UserRole } from "@/lib/models";
import type { Db, ObjectId } from "mongodb";

export type StudentCreateBody = Omit<Student, "_id"> & {
  userRole?: UserRole;
  userEmail?: string;
};

export function serializeStudent<T extends { _id: ObjectId }>(student: T) {
  return {
    ...student,
    _id: student._id.toString(),
  };
}

export function getStudentListQuery(searchParams: URLSearchParams) {
  const query: Record<string, unknown> = {};
  const grades = searchParams.getAll("grade");
  const academicYear = searchParams.get("academicYear");
  const sex = searchParams.get("sex");
  const uniqueId = searchParams.get("uniqueId");
  const limitParam = searchParams.get("limit");

  if (academicYear) query.Academic_Year = academicYear;
  if (sex) query.Sex = sex;
  if (grades.length > 0) {
    query.Grade = { $in: grades };
  }

  return {
    query,
    uniqueId,
    limit: parseInt(limitParam || "0", 10),
  };
}

export function validateStudentCreationBody(
  body: Partial<StudentCreateBody> | null | undefined,
): string | null {
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const requiredFields = [
    "Unique_ID",
    "First_Name",
    "Father_Name",
    "Academic_Year",
    "Grade",
  ] as const;

  for (const field of requiredFields) {
    if (!(field in body)) {
      return `${field} is required`;
    }
  }

  if (body.photo_data_url) {
    const p = body.photo_data_url;
    const ok =
      typeof p === "string" &&
      (p.startsWith("data:image/jpeg;base64,") ||
        p.startsWith("data:image/png;base64,"));

    if (!ok) {
      return "photo_data_url must be a JPG or PNG data URL";
    }
  }

  return null;
}

export async function ensureStudentCreationAllowed({
  db,
  body,
  userRole,
  userEmail,
  isNewStudent,
}: {
  db: Db;
  body: StudentCreateBody;
  userRole: UserRole;
  userEmail?: string;
  isNewStudent: boolean;
}) {
  const adminRoles: UserRole[] = ["Super Admin", "HR Admin"];

  if (isNewStudent) {
    const period = await db
      .collection<CategoryPeriod>("category_periods")
      .findOne({
        classification: body.Classification || "Regular",
        academicYear: String(body.Academic_Year),
      });

    if (!isCategoryRegistrationOpen(period)) {
      return {
        ok: false,
        status: 403,
        error:
          "Registration is not open for this student category and academic year.",
      };
    }
  }

  if (userRole === "Attendance Facilitator" && isNewStudent) {
    if (!userEmail) {
      return {
        ok: false,
        status: 403,
        error: "User email is required for facilitator student creation.",
      };
    }

    const facilitator = await db.collection("users").findOne({
      email: {
        $regex: new RegExp(
          `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      },
    });

    if (!facilitator?.canAddStudent) {
      return {
        ok: false,
        status: 403,
        error:
          "You do not have permission to add students. Contact HR to enable this.",
        code: "ADD_STUDENT_DENIED",
      };
    }

    const assignedGrades = Array.isArray(facilitator.grade)
      ? facilitator.grade
      : facilitator.grade
        ? [facilitator.grade]
        : [];

    if (assignedGrades.length > 0 && !assignedGrades.includes(body.Grade)) {
      return {
        ok: false,
        status: 403,
        error: `You can only add students to your assigned grade(s): ${assignedGrades.join(", ")}`,
        code: "RESTRICTED_GRADE",
      };
    }
  } else if (isNewStudent && !adminRoles.includes(userRole)) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission to add students.",
    };
  }

  return { ok: true };
}

export async function prepareStudentInsertPayload(body: StudentCreateBody) {
  const payload = { ...body } as StudentCreateBody;
  delete (payload as { userRole?: UserRole }).userRole;
  delete (payload as { userEmail?: string }).userEmail;

  try {
    const qrText = createSignedQrText(payload.Unique_ID);
    const QRCode = await import("qrcode");
    payload.qr_code = await QRCode.toDataURL(qrText);
  } catch (qrError) {
    console.error("Failed to generate QR code:", qrError);
    delete (payload as any).qr_code;
  }

  return payload as Omit<Student, "_id">;
}
