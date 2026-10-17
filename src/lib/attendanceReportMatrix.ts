import * as XLSX from "xlsx";
import { Student, Attendance, ScheduleSession } from "./models";

export interface AttendanceMatrixColumn {
  date: string; // ISO date or formatted Ethiopian date
  monthName: string; // Amharic month name, e.g. "መስከረም"
  dayNumber: string; // Sunday day number, e.g. "25"
  isNoClass?: boolean;
  isCancelled?: boolean;
  sessionId?: string;
}

export interface AttendanceMatrixRow {
  studentId: string;
  uniqueId: string; // e.g. "ብሕ07/01"
  fullName: string;
  age: string;
  gender: string; // "ወንድ" | "ሴት"
  phone: string;
  grade: string;
  statuses: Record<string, "present" | "absent" | "permission" | "pending" | "noclass" | "cancelled">;
  presentCount: number;
  absentCount: number;
  permissionCount: number;
  scheduledCount: number;
  percentage: number;
}

export interface AttendanceMatrixData {
  academicYear: string;
  semester: string;
  grade: string;
  columns: AttendanceMatrixColumn[];
  rows: AttendanceMatrixRow[];
  totalStudents: number;
  overallPresentRate: number;
}

export const ETHIOPIAN_SEMESTER_MONTHS = {
  "Semester 1": ["መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት", "መጋቢት"],
  "Semester 2": ["ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"],
};

export const GRADE_AMHARIC_NAMES: Record<string, string> = {
  "Grade 7": "ሰባተኛ",
  "Grade 8": "ስምንተኛ",
  "Grade 9": "ዘጠነኛ",
  "Grade 10": "አስረኛ",
  "Grade 11": "አስራ አንደኛ",
  "Grade 12": "አስራ ሁለተኛ",
  "7": "ሰባተኛ",
  "8": "ስምንተኛ",
  "9": "ዘጠነኛ",
  "10": "አስረኛ",
  "11": "አስራ አንደኛ",
  "12": "አስራ ሁለተኛ",
};

/**
 * Builds an attendance matrix matching the structure of the Ethiopian Sunday School attendance workbook.
 */
export function buildAttendanceMatrix(params: {
  students: Student[];
  attendance: Attendance[];
  schedules?: ScheduleSession[];
  academicYear: string;
  semester: "Semester 1" | "Semester 2";
  grade: string;
}): AttendanceMatrixData {
  const { students, attendance, schedules = [], academicYear, semester, grade } = params;

  // Filter students by academic year and grade
  const filteredStudents = students.filter((s) => {
    const yearMatch = !academicYear || String(s.Academic_Year) === String(academicYear);
    const gradeMatch = !grade || s.Grade === grade || s.Grade === `Grade ${grade}`;
    return yearMatch && gradeMatch;
  });

  // Extract relevant distinct dates from schedules or attendance
  const months = ETHIOPIAN_SEMESTER_MONTHS[semester] || ETHIOPIAN_SEMESTER_MONTHS["Semester 1"];

  // Group schedules for this grade
  const gradeSchedules = schedules.filter(
    (sc) =>
      (!grade || sc.grade === grade || sc.grade === `Grade ${grade}`) &&
      (!sc.academicYear || String(sc.academicYear) === String(academicYear)),
  );

  // Collect Sunday dates
  const dateMap = new Map<string, { monthName: string; dayNumber: string; isNoClass: boolean; isCancelled: boolean; sessionId?: string }>();

  // If schedules exist, use them as ground truth for scheduled Sundays
  gradeSchedules.forEach((sc) => {
    const parts = sc.date.split("-");
    const dayNumber = parts[2] || parts[0] || sc.date;
    // Attempt to identify Ethiopian month or fallback
    const monthName = months[0] || "መስከረም";
    dateMap.set(sc.date, {
      monthName,
      dayNumber,
      isNoClass: sc.status === "cancelled",
      isCancelled: sc.status === "cancelled",
      sessionId: sc._id?.toString(),
    });
  });

  // If no schedules exist, extract dates from attendance records for this grade
  if (dateMap.size === 0) {
    attendance.forEach((a) => {
      if (a.date && !dateMap.has(a.date)) {
        const parts = a.date.split("-");
        const dayNumber = parts[2] || parts[0] || a.date;
        dateMap.set(a.date, {
          monthName: months[0] || "መስከረም",
          dayNumber,
          isNoClass: false,
          isCancelled: false,
        });
      }
    });
  }

  const columns: AttendanceMatrixColumn[] = Array.from(dateMap.entries()).map(([date, meta]) => ({
    date,
    monthName: meta.monthName,
    dayNumber: meta.dayNumber,
    isNoClass: meta.isNoClass,
    isCancelled: meta.isCancelled,
    sessionId: meta.sessionId,
  }));

  let totalPresentCount = 0;
  let totalScheduledSlots = 0;

  const rows: AttendanceMatrixRow[] = filteredStudents.map((s) => {
    const studentId = s._id?.toString() || "";
    const statuses: Record<string, "present" | "absent" | "permission" | "pending" | "noclass" | "cancelled"> = {};

    let presentCount = 0;
    let absentCount = 0;
    let permissionCount = 0;
    let scheduledCount = 0;

    columns.forEach((col) => {
      if (col.isCancelled) {
        statuses[col.date] = "cancelled";
        return;
      }
      if (col.isNoClass) {
        statuses[col.date] = "noclass";
        return;
      }

      scheduledCount++;

      const rec = attendance.find(
        (a) => a.studentId === studentId && a.date === col.date,
      );

      if (rec) {
        if (rec.present) {
          statuses[col.date] = "present";
          presentCount++;
        } else if (rec.hasPermission) {
          statuses[col.date] = "permission";
          permissionCount++;
        } else {
          statuses[col.date] = "absent";
          absentCount++;
        }
      } else {
        // Unrecorded scheduled session remains pending
        statuses[col.date] = "pending";
      }
    });

    const percentage = scheduledCount > 0 ? Math.round((presentCount / scheduledCount) * 100) : 0;
    totalPresentCount += presentCount;
    totalScheduledSlots += scheduledCount;

    const age = (s as any).Age ? String((s as any).Age) : "";
    const gender = s.Sex === "Female" || s.Sex === "ሴት" || s.Sex === "F" ? "ሴት" : "ወንድ";
    const phone = s.Phone_Number || "";

    return {
      studentId,
      uniqueId: s.Unique_ID,
      fullName: `${s.First_Name} ${s.Father_Name} ${s.Grandfather_Name || ""}`.trim(),
      age,
      gender,
      phone,
      grade: s.Grade,
      statuses,
      presentCount,
      absentCount,
      permissionCount,
      scheduledCount,
      percentage,
    };
  });

  const overallPresentRate = totalScheduledSlots > 0 ? Math.round((totalPresentCount / totalScheduledSlots) * 100) : 0;

  return {
    academicYear,
    semester,
    grade,
    columns,
    rows,
    totalStudents: rows.length,
    overallPresentRate,
  };
}

/**
 * Exports the structured attendance matrix to an Excel workbook matching
 * the reference workbook `የ2018 ዓ.ም የከሰዓት መርሃ ግብር መጀመሪያው መንፈቅ ዓመት የአቴንዳንስ.xlsx`.
 */
export function exportAttendanceWorkbook(matrix: AttendanceMatrixData, filename?: string) {
  const amharicGrade = GRADE_AMHARIC_NAMES[matrix.grade] || matrix.grade || "አቴንዳንስ";
  const sheetName = matrix.semester === "Semester 2" ? `${amharicGrade} 2` : amharicGrade;

  // Build 2D array for worksheet
  const rows: any[][] = [];

  // Row 1: Empty spacing row
  rows.push([]);

  // Row 2: Top header with Month names and calculation titles
  // ["የተማሪዎች መለያ ቁጥር", "የተማሪ ስም ዝርዝር", null, null, null, Month1, ... MonthN, "ተሳትፎ", "ቀሪ", "አማካይ"]
  const headerRow1: any[] = [
    "የተማሪዎች መለያ ቁጥር",
    "የተማሪ ስም ዝርዝር",
    null,
    null,
    null,
  ];

  matrix.columns.forEach((col) => {
    headerRow1.push(col.monthName);
  });
  headerRow1.push("ተሳትፎ");
  headerRow1.push("ቀሪ");
  headerRow1.push("ፍቃድ");
  headerRow1.push("አማካይ (%)");
  rows.push(headerRow1);

  // Row 3: Sub-headers with Student Details and Sunday day numbers
  // [null, null, "ዕድሜ", "ጾታ", "ስልክ ቁጥር", Day1, ... DayN]
  const headerRow2: any[] = [
    null,
    null,
    "ዕድሜ",
    "ጾታ",
    "ስልክ ቁጥር",
  ];
  matrix.columns.forEach((col) => {
    headerRow2.push(col.dayNumber);
  });
  headerRow2.push(null, null, null, null);
  rows.push(headerRow2);

  // Data rows
  matrix.rows.forEach((r) => {
    const dataRow: any[] = [
      r.uniqueId,
      r.fullName,
      r.age,
      r.gender,
      r.phone,
    ];

    matrix.columns.forEach((col) => {
      const status = r.statuses[col.date];
      if (status === "present") dataRow.push("አለ/ች");
      else if (status === "absent") dataRow.push("ቀሪ");
      else if (status === "permission") dataRow.push("ፍቃድ");
      else if (status === "noclass") dataRow.push("ክፍለ ጊዜ የለም");
      else if (status === "cancelled") dataRow.push("ተሰርዟል");
      else dataRow.push(null);
    });

    dataRow.push(r.presentCount);
    dataRow.push(r.absentCount);
    dataRow.push(r.permissionCount);
    dataRow.push(`${r.percentage}%`);

    rows.push(dataRow);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Apply column widths
  const colWidths: { wch: number }[] = [
    { wch: 16 }, // ID
    { wch: 28 }, // Name
    { wch: 8 },  // Age
    { wch: 8 },  // Sex
    { wch: 14 }, // Phone
  ];

  matrix.columns.forEach(() => {
    colWidths.push({ wch: 8 });
  });

  colWidths.push({ wch: 10 }); // ተሳትፎ
  colWidths.push({ wch: 10 }); // ቀሪ
  colWidths.push({ wch: 10 }); // ፍቃድ
  colWidths.push({ wch: 12 }); // አማካይ

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const finalName = filename || `የ${matrix.academicYear}_ዓ.ም_${sheetName}_የአቴንዳንስ_ሪፖርት.xlsx`;
  XLSX.writeFile(workbook, finalName);
}
