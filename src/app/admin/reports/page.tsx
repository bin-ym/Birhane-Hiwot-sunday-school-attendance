"use client";

import { useEffect, useState } from "react";
import { Student, User, Attendance } from "@/lib/models";
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

export default function AdminReportsPage() {
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

  const attendanceRate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((x) => x.present).length / attendance.length) * 100,
        )
      : 0;

  return (
    <ReportPageLayout
      badge="Department admin"
      title="Reports & export"
      subtitle="Snapshot of students, facilitators, and attendance across the modules you can access. Export raw tables for spreadsheets or audits."
      heroGradient="from-slate-900 via-blue-950 to-indigo-950"
    >
      <ReportStatGrid>
        <ReportStatCard
          label="Students on file"
          value={loading ? "…" : students.length}
          hint="All records returned by the students API."
          valueClassName="text-blue-700"
        />
        <ReportStatCard
          label="Facilitator accounts"
          value={loading ? "…" : facilitators.length}
          hint="Users with facilitator or related roles."
          valueClassName="text-emerald-700"
        />
        <ReportStatCard
          label="Attendance rate"
          value={loading ? "…" : `${attendanceRate}%`}
          hint="Present ÷ total attendance rows (global sample)."
          valueClassName="text-amber-600"
        />
        <ReportStatCard
          label="Attendance rows"
          value={loading ? "…" : attendance.length}
          hint="Individual mark rows in the attendance collection."
          valueClassName="text-violet-700"
        />
      </ReportStatGrid>

      <ReportSection title="CSV exports">
        <p className="mb-4 text-sm text-gray-600 sm:mb-6">
          Downloads use the same field layout as the live API. Large exports may
          take a moment in the browser.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"
            onClick={() => exportToCSV(students as unknown[], "students.csv")}
            disabled={students.length === 0}
          >
            Export students
          </button>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
            onClick={() =>
              exportToCSV(facilitators as unknown[], "facilitators.csv")
            }
            disabled={facilitators.length === 0}
          >
            Export facilitators
          </button>
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-violet-700 disabled:opacity-50"
            onClick={() =>
              exportToCSV(attendance as unknown[], "attendance.csv")
            }
            disabled={attendance.length === 0}
          >
            Export attendance
          </button>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
