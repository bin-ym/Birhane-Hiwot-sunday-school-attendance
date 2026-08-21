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
  ExportButton,
  ProgressBar,
  DonutChart,
  Skeleton,
  ReportFilters,
} from "@/components/reports/ReportPageLayout";
import { UserCheck, AlertTriangle, FileText } from "lucide-react";

import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

export default function FacilitatorReportsDashboard() {
  const { data: session } = useSession();
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string }>({});

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
      safeFetch<any[]>(`/api/students${qs}`, []),
      safeFetch<any[]>(`/api/attendance${qs}`, []),
    ]).then(([s, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setAttendance(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, [facilitatorGrade]);

  const currentYearStudents = useMemo(
    () =>
      students.filter((st) =>
        academicYearMatchesEthiopian(String(st.Academic_Year), ecYear),
      ),
    [students, ecYear],
  );

  const filteredAttendance = useMemo(() => {
    let result = attendance;
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((a) => new Date(a.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((a) => new Date(a.date) <= to);
    }
    return result;
  }, [attendance, filters]);

  const presentCount = useMemo(
    () => filteredAttendance.filter((a) => a.present).length,
    [filteredAttendance],
  );
  const absentCount = filteredAttendance.length - presentCount;
  const attendanceRate =
    filteredAttendance.length > 0
      ? Math.round((presentCount / filteredAttendance.length) * 100)
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-6 py-12 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-amber-400" />
          <h3 className="text-lg font-bold text-amber-900">No grade assignment</h3>
          <p className="mt-1 text-sm text-amber-700">
            Contact an administrator to assign your grade scope.
          </p>
        </div>
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
      <ReportFilters
        grades={[]}
        onFilter={setFilters}
        showAcademicYear={false}
        showGrade={false}
        showDateRange
      />

      <ReportStatGrid>
        <ReportStatCard
          label={`My students (${ecYear} EC)`}
          value={loading ? "…" : currentYearStudents.length}
          hint="Filtered from your grade-scoped API list."
          valueClassName="text-violet-700"
          animate={!loading}
        />
        <ReportStatCard
          label="Attendance rows"
          value={loading ? "…" : filteredAttendance.length}
          valueClassName="text-blue-700"
          animate={!loading}
        />
        <ReportStatCard
          label="Present marks"
          value={loading ? "…" : presentCount}
          valueClassName="text-emerald-600"
          animate={!loading}
        />
        <ReportStatCard
          label="Attendance rate"
          value={loading ? "…" : `${attendanceRate}%`}
          hint={`Absent rows: ${absentCount}`}
          valueClassName="text-amber-600"
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Attendance breakdown" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-8">
            <DonutChart
              value={presentCount}
              max={filteredAttendance.length}
              size={130}
              strokeWidth={10}
              color="#8b5cf6"
              label="Attendance rate"
            />
            <div className="flex-1 space-y-4">
              <ProgressBar value={presentCount} max={filteredAttendance.length} color="violet" />
              <div className="flex justify-between gap-4">
                <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Present
                  </p>
                  <p className="text-xl font-bold text-emerald-600">{presentCount}</p>
                </div>
                <div className="flex-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <UserCheck className="h-3.5 w-3.5 text-red-500" />
                    Absent
                  </p>
                  <p className="text-xl font-bold text-red-600">{absentCount}</p>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Exports">
          <p className="mb-4 text-sm text-gray-600">
            Downloads match your filtered data scope.
          </p>
          <div className="flex flex-col gap-3">
            <ExportButton
              label={`Students Excel (${ecYear} EC)`}
              color="gray"
              onClick={() =>
                exportToExcel(currentYearStudents as unknown[], "My_Class_Students_Current_Year")
              }
              disabled={currentYearStudents.length === 0}
            />
            <ExportButton
              label="Students PDF"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: currentYearStudents as any[],
                  title: `Class Students (${ecYear} EC)`,
                  filename: `My_Class_Students_PDF`,
                  subtitle: `Grades: ${displayGrade} | Total: ${currentYearStudents.length}`,
                })
              }
              disabled={currentYearStudents.length === 0}
            />
            <ExportButton
              label="Attendance Excel"
              color="violet"
              onClick={() =>
                exportToExcel(
                  filteredAttendance.map((a) => ({
                    Date: new Date(a.date).toLocaleDateString(),
                    Student: a.studentId,
                    Present: a.present ? "YES" : "NO",
                    Reason: a.reason || "",
                  })) as unknown[],
                  "My_Class_Attendance_Log",
                )
              }
              disabled={filteredAttendance.length === 0}
            />
            <ExportButton
              label="Attendance PDF"
              color="violet"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: filteredAttendance.map((a) => ({
                    Date: new Date(a.date).toLocaleDateString(),
                    Student: a.studentId,
                    Present: a.present ? "YES" : "NO",
                    Reason: a.reason || "",
                  })),
                  title: `Attendance Log (${ecYear} EC)`,
                  filename: "My_Class_Attendance_PDF",
                  subtitle: `Period: ${filters.dateFrom || "all"} → ${filters.dateTo || "all"} | Rows: ${filteredAttendance.length}`,
                })
              }
              disabled={filteredAttendance.length === 0}
            />
          </div>
        </ReportSection>
      </div>
    </ReportPageLayout>
  );
}
