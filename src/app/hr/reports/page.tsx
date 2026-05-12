"use client";

import { useEffect, useState, useMemo } from "react";
import { Student, User } from "@/lib/models";
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

export default function HRReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/facilitators").then((res) => res.json()),
    ]).then(([s, f]) => {
      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
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

  return (
    <ReportPageLayout
      badge="HR"
      title="Staffing & registry intelligence"
      subtitle="Cross-check facilitator accounts against the student body. Current-year student counts help align Sunday school intake with this Ethiopian academic year."
      heroGradient="from-blue-950 via-indigo-900 to-slate-900"
    >
      <ReportStatGrid>
        <ReportStatCard
          label="All students (API)"
          value={loading ? "…" : students.length}
          hint="Full roster from the students endpoint."
          valueClassName="text-blue-700"
        />
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={loading ? "…" : currentYearStudents.length}
          hint="Filtered to the current Ethiopian academic year."
          valueClassName="text-emerald-700"
        />
        <ReportStatCard
          label="Education facilitators"
          value={loading ? "…" : totalEducationFacilitators}
          valueClassName="text-indigo-700"
        />
        <ReportStatCard
          label="Attendance facilitators"
          value={loading ? "…" : totalAttendanceFacilitators}
          valueClassName="text-violet-700"
        />
      </ReportStatGrid>

      <ReportSection title="Exports & tools">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:p-5">
            <h3 className="font-bold text-gray-900">Staff registry</h3>
            <p className="mt-1 text-sm text-gray-600">
              Master list of facilitator accounts you are allowed to see.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 sm:w-auto sm:px-6"
              onClick={() =>
                exportToCSV(facilitators as unknown[], "all_staff_registry.csv")
              }
              disabled={facilitators.length === 0}
            >
              Export staff CSV
            </button>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:p-5">
            <h3 className="font-bold text-gray-900">Global students</h3>
            <p className="mt-1 text-sm text-gray-600">
              {students.length} records — use filters in the student registry UI
              for narrower slices.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50 sm:w-auto sm:px-6"
              onClick={() =>
                exportToCSV(students as unknown[], "global_students_registry.csv")
              }
              disabled={students.length === 0}
            >
              Export students CSV
            </button>
          </div>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
