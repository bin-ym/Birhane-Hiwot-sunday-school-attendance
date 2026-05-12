"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Student, Attendance } from "@/lib/models";
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

export default function FacilitatorReportsDashboard() {
  const { data: session } = useSession();
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const facilitatorGrade = session?.user?.grade as
    | string
    | string[]
    | undefined;

  useEffect(() => {
    if (!facilitatorGrade || facilitatorGrade.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (Array.isArray(facilitatorGrade)) {
      facilitatorGrade.forEach((grade) => params.append("grade", grade));
    } else {
      params.append("grade", facilitatorGrade);
    }
    const qs = `?${params.toString()}`;

    Promise.all([
      fetch(`/api/students${qs}`).then((res) => res.json()),
      fetch(`/api/attendance${qs}`).then((res) => res.json()),
    ]).then(([s, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setAttendance(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, [facilitatorGrade]);

  const currentYearStudents = useMemo(
    () =>
      students.filter((st) =>
        academicYearMatchesEthiopian(String(st.Academic_Year), ecYear),
      ),
    [students, ecYear],
  );

  const presentCount = useMemo(
    () => attendance.filter((a) => a.present).length,
    [attendance],
  );
  const absentCount = attendance.length - presentCount;
  const attendanceRate =
    attendance.length > 0
      ? Math.round((presentCount / attendance.length) * 100)
      : 0;

  const displayGrade = Array.isArray(facilitatorGrade)
    ? facilitatorGrade.join(", ")
    : facilitatorGrade;

  if (!facilitatorGrade || facilitatorGrade.length === 0) {
    return (
      <ReportPageLayout
        badge="Attendance"
        title="Class reports"
        subtitle="No grades are assigned to your facilitator account yet."
        heroGradient="from-violet-950 via-purple-900 to-indigo-950"
      >
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-900">
          Contact an administrator to assign your grade scope.
        </p>
      </ReportPageLayout>
    );
  }

  return (
    <ReportPageLayout
      badge="Attendance facilitator"
      title="Class performance"
      subtitle={`Scoped to your grades: ${displayGrade}. Student counts below use the current academic year (${ecYear} EC) only; attendance includes all stored marks for your classes.`}
      heroGradient="from-indigo-950 via-violet-900 to-purple-950"
    >
      <ReportStatGrid>
        <ReportStatCard
          label={`My students (${ecYear} EC)`}
          value={loading ? "…" : currentYearStudents.length}
          hint="Filtered from your grade-scoped API list."
          valueClassName="text-violet-700"
        />
        <ReportStatCard
          label="Attendance rows"
          value={loading ? "…" : attendance.length}
          valueClassName="text-blue-700"
        />
        <ReportStatCard
          label="Present marks"
          value={loading ? "…" : presentCount}
          valueClassName="text-emerald-600"
        />
        <ReportStatCard
          label="Attendance rate"
          value={loading ? "…" : `${attendanceRate}%`}
          hint={`Absent rows: ${absentCount}`}
          valueClassName="text-amber-600"
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection
          title="Attendance mix"
          className="lg:col-span-2"
        >
          <div className="h-4 overflow-hidden rounded-full bg-red-100">
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
            <div>
              <p className="text-gray-500">Present</p>
              <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Exports">
          <p className="mb-4 text-sm text-gray-600">
            CSV files match your API scope (grade query on the server).
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="rounded-xl bg-white py-3 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50"
              onClick={() =>
                exportToCSV(currentYearStudents as unknown[], "my_class_students_current_year.csv")
              }
              disabled={currentYearStudents.length === 0}
            >
              Students ({ecYear} EC)
            </button>
            <button
              type="button"
              className="rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow transition hover:bg-violet-500 disabled:opacity-50"
              onClick={() =>
                exportToCSV(
                  attendance.map((a) => ({
                    Date: new Date(a.date).toLocaleDateString(),
                    Student: a.studentId,
                    Present: a.present ? "YES" : "NO",
                    Reason: a.reason || "",
                  })) as unknown[],
                  "my_class_attendance_log.csv",
                )
              }
              disabled={attendance.length === 0}
            >
              Attendance log
            </button>
          </div>
        </ReportSection>
      </div>
    </ReportPageLayout>
  );
}
