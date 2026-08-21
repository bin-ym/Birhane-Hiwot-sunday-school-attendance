"use client";

import { useEffect, useState, useMemo } from "react";
import { Student, User, Attendance } from "@/lib/models";
import { GRADE_OPTIONS } from "@/lib/constants";
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
import { Users, GraduationCap, ClipboardCheck, Calendar, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

export default function AdminReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<{ academicYear?: string; grade?: string; dateFrom?: string; dateTo?: string }>({});

  // Students are fetched server-side filtered by grade/academic year so the
  // page doesn't download the entire registry just to filter it in the browser.
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
    }).finally(() => setLoading(false));
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

  const presentRows = filteredAttendance.filter((x) => x.present).length;
  const attendanceRate =
    filteredAttendance.length > 0
      ? Math.round((presentRows / filteredAttendance.length) * 100)
      : 0;

  if (loading) {
    return (
      <ReportPageLayout
        badge="Department admin"
        title="Reports & export"
        subtitle="Loading your data..."
        heroGradient="from-slate-900 via-blue-950 to-indigo-950"
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
      badge="Department admin"
      title="Reports & export"
      subtitle="Snapshot of students, facilitators, and attendance across the modules you can access. Export raw tables for spreadsheets or audits."
      heroGradient="from-slate-900 via-blue-950 to-indigo-950"
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
          label="Students on file"
          value={filteredStudents.length}
          hint="Filtered by grade & academic year."
          valueClassName="text-blue-700"
          animate
        />
        <ReportStatCard
          label="Facilitator accounts"
          value={facilitators.length}
          hint="Users with facilitator or related roles."
          valueClassName="text-emerald-700"
          animate
        />
        <ReportStatCard
          label="Attendance rate"
          value={`${attendanceRate}%`}
          hint="Present ÷ total (filtered)."
          valueClassName="text-amber-600"
        />
        <ReportStatCard
          label="Attendance rows"
          value={filteredAttendance.length}
          hint="Filtered by date range."
          valueClassName="text-violet-700"
          animate
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Attendance overview" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-8">
            <DonutChart
              value={presentRows}
              max={filteredAttendance.length}
              size={130}
              strokeWidth={10}
              color="#6366f1"
              label="Present rate"
            />
            <div className="flex-1 space-y-4">
              <ProgressBar value={presentRows} max={filteredAttendance.length} color="violet" />
              <div className="flex justify-between gap-6 text-sm">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-xl font-bold text-emerald-600">{presentRows}</p>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-xl font-bold text-red-600">{filteredAttendance.length - presentRows}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-700">{filteredAttendance.length}</p>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>

        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm sm:rounded-3xl sm:p-8">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ClipboardCheck className="h-5 w-5 text-indigo-500" />
            Data Overview
          </h3>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4 text-blue-500" />
                Students
              </span>
              <span className="font-bold text-gray-900">{filteredStudents.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                Facilitators
              </span>
              <span className="font-bold text-gray-900">{facilitators.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-violet-500" />
                Attendance rows
              </span>
              <span className="font-bold text-gray-900">{filteredAttendance.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-600">
                <ClipboardCheck className="h-4 w-4 text-amber-500" />
                Rate
              </span>
              <span className="font-bold text-amber-600">{attendanceRate}%</span>
            </div>
          </div>
        </div>
      </div>

      <ReportSection title="Exports">
        <p className="mb-4 text-sm text-gray-600 sm:mb-6">
          Download data as Excel or PDF for offline analysis and auditing.
        </p>
        <div className="flex flex-col gap-4">
          {/* Excel exports */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ExportButton
              label="Export students (Excel)"
              color="blue"
              onClick={() => exportToExcel(filteredStudents as unknown[], "Admin_Students")}
              disabled={filteredStudents.length === 0}
            />
            <ExportButton
              label="Export facilitators (Excel)"
              color="emerald"
              onClick={() => exportToExcel(facilitators as unknown[], "Admin_Facilitators")}
              disabled={facilitators.length === 0}
            />
            <ExportButton
              label="Export attendance (Excel)"
              color="violet"
              onClick={() => exportToExcel(filteredAttendance as unknown[], "Admin_Attendance")}
              disabled={filteredAttendance.length === 0}
            />
          </div>
          {/* PDF exports */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ExportButton
              label="Export students (PDF)"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: filteredStudents as any[],
                  title: "Admin - Students Report",
                  filename: "Admin_Students_PDF",
                  subtitle: `Total: ${filteredStudents.length} students`,
                })
              }
              disabled={filteredStudents.length === 0}
            />
            <ExportButton
              label="Export facilitators (PDF)"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: facilitators as any[],
                  title: "Admin - Facilitators Report",
                  filename: "Admin_Facilitators_PDF",
                  subtitle: `Total: ${facilitators.length} facilitators`,
                })
              }
              disabled={facilitators.length === 0}
            />
            <ExportButton
              label="Export attendance (PDF)"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: (filteredAttendance as any[]).map((a) => ({
                    Date: new Date(a.date).toLocaleDateString(),
                    Student: a.studentId,
                    Present: a.present ? "YES" : "NO",
                    Reason: a.reason || "",
                  })),
                  title: "Admin - Attendance Report",
                  filename: "Admin_Attendance_PDF",
                  subtitle: `Period: ${filters.dateFrom || "all"} → ${filters.dateTo || "all"} | Rows: ${filteredAttendance.length}`,
                })
              }
              disabled={filteredAttendance.length === 0}
            />
          </div>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
