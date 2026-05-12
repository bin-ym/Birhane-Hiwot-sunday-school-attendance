"use client";

import { useEffect, useState, useMemo } from "react";
import { Student, User, Attendance } from "@/lib/models";
import {
  academicYearMatchesEthiopian,
  getCurrentEthiopianYear,
} from "@/lib/utils";
import {
  ReportPageLayout,
  ReportSection,
  ReportStatCard,
  ReportStatGrid,
} from "@/components/reports/ReportPageLayout";

function exportToCSV(data: unknown[], filename: string) {
  if (data.length === 0) return;
  const csv = [
    Object.keys(data[0] as object).join(","),
    ...data.map((row) =>
      Object.values(row as Record<string, unknown>)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SuperAdminReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/facilitators").then((res) => res.json()),
      fetch("/api/attendance").then((res) => res.json()),
    ]).then(([s, f, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
      setAttendance(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);

  const currentYearStudents = useMemo(
    () =>
      students.filter((st) =>
        academicYearMatchesEthiopian(String(st.Academic_Year), ecYear),
      ),
    [students, ecYear],
  );

  const totalEducationFacilitators = facilitators.filter(
    (f) => f.role === "Education Facilitator",
  ).length;
  const totalAttendanceFacilitators = facilitators.filter(
    (f) => f.role === "Attendance Facilitator",
  ).length;
  const presentRows = attendance.filter((x) => x.present).length;
  const attendanceRate =
    attendance.length > 0
      ? Math.round((presentRows / attendance.length) * 100)
      : 0;

  return (
    <ReportPageLayout
      badge="Super Admin"
      title="System intelligence"
      subtitle="Global counts for students, facilitator roles, and attendance volume. Exports mirror database collections for offline analysis."
      heroGradient="from-gray-950 via-zinc-900 to-indigo-950"
    >
      <ReportStatGrid>
        <ReportStatCard
          label="Students (all years)"
          value={loading ? "…" : students.length}
          valueClassName="text-gray-900"
        />
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={loading ? "…" : currentYearStudents.length}
          hint="Current Ethiopian academic year only."
          valueClassName="text-emerald-600"
        />
        <ReportStatCard
          label="Education facilitators"
          value={loading ? "…" : totalEducationFacilitators}
          valueClassName="text-blue-600"
        />
        <ReportStatCard
          label="Attendance facilitators"
          value={loading ? "…" : totalAttendanceFacilitators}
          valueClassName="text-purple-600"
        />
      </ReportStatGrid>

      <ReportStatGrid>
        <ReportStatCard
          label="Attendance rows"
          value={loading ? "…" : attendance.length}
          valueClassName="text-gray-900"
        />
        <ReportStatCard
          label="Present / total"
          value={
            loading
              ? "…"
              : `${presentRows} / ${attendance.length || 0}`
          }
          hint={`Approx. rate ${attendanceRate}%`}
          valueClassName="text-emerald-700"
        />
        <ReportStatCard
          label="Staff accounts (API)"
          value={loading ? "…" : facilitators.length}
          valueClassName="text-indigo-700"
        />
      </ReportStatGrid>

      <ReportSection title="Database exports">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50"
            onClick={() =>
              exportToCSV(students as unknown[], "system_students_dump.csv")
            }
            disabled={students.length === 0}
          >
            <span className="text-2xl font-black text-gray-900">
              {loading ? "–" : students.length}
            </span>
            <span className="mt-2 font-semibold text-gray-600">
              Export students
            </span>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            onClick={() =>
              exportToCSV(
                facilitators as unknown[],
                "system_facilitators_dump.csv",
              )
            }
            disabled={facilitators.length === 0}
          >
            <span className="text-2xl font-black text-blue-700">
              {loading ? "–" : facilitators.length}
            </span>
            <span className="mt-2 font-semibold text-gray-600">
              Export facilitators
            </span>
          </button>
          <button
            type="button"
            className="flex flex-col items-start rounded-2xl border border-gray-200 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 sm:col-span-2 lg:col-span-1"
            onClick={() =>
              exportToCSV(
                attendance.map((x) => ({
                  Date: new Date(x.date).toLocaleDateString(),
                  Student: x.studentId,
                  Present: x.present ? "YES" : "NO",
                  Reason: x.reason || "",
                })) as unknown[],
                "system_attendance_dump.csv",
              )
            }
            disabled={attendance.length === 0}
          >
            <span className="text-2xl font-black text-emerald-700">
              {loading ? "–" : attendance.length}
            </span>
            <span className="mt-2 font-semibold text-gray-600">
              Export attendance (flattened)
            </span>
          </button>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
