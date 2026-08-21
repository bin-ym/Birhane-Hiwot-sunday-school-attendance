"use client";

import { useEffect, useState, useMemo } from "react";
import { Student, User, Attendance } from "@/lib/models";
import { GRADE_OPTIONS } from "@/lib/constants";
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
import {
  Users,
  GraduationCap,
  Activity,
  Database,
  FileText,
} from "lucide-react";

import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

export default function SuperAdminReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ academicYear?: string; grade?: string; dateFrom?: string; dateTo?: string }>({});

  // Students are fetched server-side filtered by grade/academic year.
  const studentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.academicYear) params.append("academicYear", filters.academicYear);
    const qs = params.toString();
    return `/api/students${qs ? `?${qs}` : ""}`;
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      safeFetch<any[]>(studentsUrl, []),
      safeFetch<any[]>('/api/facilitators', []),
      safeFetch<any[]>('/api/attendance', []),
    ]).then(([s, f, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
      setAttendance(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, [studentsUrl]);

  // Students are already server-filtered; keep the memo as a cheap safety net.
  const filteredStudents = useMemo(() => students, [students]);

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

  const currentYearStudents = useMemo(
    () =>
      filteredStudents.filter((st) =>
        academicYearMatchesEthiopian(String(st.Academic_Year), ecYear),
      ),
    [filteredStudents, ecYear],
  );

  const totalEducationFacilitators = facilitators.filter(
    (f) => f.role === "Education Facilitator",
  ).length;
  const totalAttendanceFacilitators = facilitators.filter(
    (f) => f.role === "Attendance Facilitator",
  ).length;
  const presentRows = filteredAttendance.filter((x) => x.present).length;
  const absentRows = filteredAttendance.length - presentRows;
  const attendanceRate =
    filteredAttendance.length > 0
      ? Math.round((presentRows / filteredAttendance.length) * 100)
      : 0;

  if (loading) {
    return (
      <ReportPageLayout
        badge="Super Admin"
        title="System intelligence"
        subtitle="Loading data..."
        heroGradient="from-gray-950 via-zinc-900 to-indigo-950"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </ReportPageLayout>
    );
  }

  return (
    <ReportPageLayout
      badge="Super Admin"
      title="System intelligence"
      subtitle="Global counts for students, facilitator roles, and attendance volume. Exports mirror database collections for offline analysis."
      heroGradient="from-gray-950 via-zinc-900 to-indigo-950"
    >
      <ReportFilters
        grades={GRADE_OPTIONS}
        onFilter={setFilters}
        showAcademicYear
        showGrade
        showDateRange
      />

      <ReportStatGrid>
        <ReportStatCard
          label="Students (all years)"
          value={filteredStudents.length}
          valueClassName="text-gray-900"
          animate
        />
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={currentYearStudents.length}
          hint="Current Ethiopian academic year only."
          valueClassName="text-emerald-600"
          animate
        />
        <ReportStatCard
          label="Education facilitators"
          value={totalEducationFacilitators}
          valueClassName="text-blue-600"
          animate
        />
        <ReportStatCard
          label="Attendance facilitators"
          value={totalAttendanceFacilitators}
          valueClassName="text-purple-600"
          animate
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Attendance overview" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-8">
            <DonutChart
              value={presentRows}
              max={filteredAttendance.length}
              size={140}
              strokeWidth={12}
              color="#6366f1"
              label="Present rate"
            />
            <div className="flex-1 space-y-4">
              <ProgressBar value={presentRows} max={filteredAttendance.length} color="violet" />
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-lg font-bold text-emerald-600">{presentRows}</p>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-lg font-bold text-red-600">{absentRows}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <p className="text-xs text-gray-500">Rate</p>
                  <p className="text-lg font-bold text-gray-700">{attendanceRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Quick facts">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Database className="h-4 w-4 text-gray-400" />
                Staff accounts
              </span>
              <span className="text-lg font-bold text-gray-900">{facilitators.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-gray-400" />
                Attendance rows
              </span>
              <span className="text-lg font-bold text-gray-900">{filteredAttendance.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                Total students
              </span>
              <span className="text-lg font-bold text-gray-900">{filteredStudents.length}</span>
            </div>
          </div>
        </ReportSection>
      </div>

      <ReportSection title="Database exports">
        <p className="mb-6 text-sm text-gray-600">
          Download raw database collections for offline analysis and auditing.
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 transition-shadow duration-300 hover:shadow-md">
              <p className="text-3xl font-black text-gray-900">{filteredStudents.length}</p>
              <div className="mt-3 flex gap-2">
                <ExportButton
                  label="Excel"
                  color="gray"
                  onClick={() => exportToExcel(filteredStudents as unknown[], "System_Students_Dump")}
                  disabled={filteredStudents.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredStudents as any[],
                      title: "System - Students Dump",
                      filename: "System_Students_PDF",
                      subtitle: `Total: ${filteredStudents.length} students`,
                    })
                  }
                  disabled={filteredStudents.length === 0}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 transition-shadow duration-300 hover:shadow-md">
              <p className="text-3xl font-black text-blue-700">{facilitators.length}</p>
              <div className="mt-3 flex gap-2">
                <ExportButton
                  label="Excel"
                  color="blue"
                  onClick={() => exportToExcel(facilitators as unknown[], "System_Facilitators_Dump")}
                  disabled={facilitators.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: facilitators as any[],
                      title: "System - Facilitators Dump",
                      filename: "System_Facilitators_PDF",
                      subtitle: `Total: ${facilitators.length} facilitators`,
                    })
                  }
                  disabled={facilitators.length === 0}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 transition-shadow duration-300 hover:shadow-md sm:col-span-2 lg:col-span-1">
              <p className="text-3xl font-black text-emerald-700">{filteredAttendance.length}</p>
              <div className="mt-3 flex gap-2">
                <ExportButton
                  label="Excel"
                  color="emerald"
                  onClick={() =>
                    exportToExcel(
                      filteredAttendance.map((x) => ({
                        Date: new Date(x.date).toLocaleDateString(),
                        Student: x.studentId,
                        Present: x.present ? "YES" : "NO",
                        Reason: x.reason || "",
                      })) as unknown[],
                      "System_Attendance_Dump",
                    )
                  }
                  disabled={filteredAttendance.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredAttendance.map((x) => ({
                        Date: new Date(x.date).toLocaleDateString(),
                        Student: x.studentId,
                        Present: x.present ? "YES" : "NO",
                        Reason: x.reason || "",
                      })),
                      title: "System - Attendance Dump",
                      filename: "System_Attendance_PDF",
                      subtitle: `Period: ${filters.dateFrom || "all"} → ${filters.dateTo || "all"} | Rows: ${filteredAttendance.length}`,
                    })
                  }
                  disabled={filteredAttendance.length === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
