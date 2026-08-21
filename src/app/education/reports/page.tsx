"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Student } from "@/lib/models";
import { GRADE_OPTIONS } from "@/lib/constants";
import {
  ReportPageLayout,
  ReportSection,
  ReportStatCard,
  ReportStatGrid,
  ExportButton,
  Skeleton,
  ReportFilters,
} from "@/components/reports/ReportPageLayout";
import {
  GraduationCap,
  Download,
  Shield,
  FileText,
} from "lucide-react";

type TeacherAccount = {
  _id: string;
  name?: string;
  email: string;
  role?: string;
  createdAt?: string;
};

import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

export default function EducationReportsDashboard() {
  const { data: session } = useSession();
  const role = String(session?.user?.role || "");

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ academicYear?: string; grade?: string }>({});

  // Students are fetched server-side filtered by grade/academic year.
  const studentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.academicYear) params.append("academicYear", filters.academicYear);
    const qs = params.toString();
    return `/api/students${qs ? `?${qs}` : ""}`;
  }, [filters]);

  useEffect(() => {
    setLoadingStudents(true);
    safeFetch<any[]>(studentsUrl, [])
      .then((s) => {
        setStudents(Array.isArray(s) ? s : []);
      })
      .finally(() => setLoadingStudents(false));
  }, [studentsUrl]);

  useEffect(() => {
    setLoadingTeachers(true);
    setTeachersError(null);
    safeFetch<any[]>('/api/facilitators', [])
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length === 0 && !Array.isArray(data)) {
          setTeachersError("Could not load teachers (auth may be required)");
        }
        const educationOnly = list.filter(
          (u: TeacherAccount) => u.role === "Education Facilitator",
        );
        setTeachers(educationOnly);
      })
      .catch((e) =>
        setTeachersError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoadingTeachers(false));
  }, []);

  // Students are already server-filtered; keep the memo as a cheap safety net.
  const filteredStudents = useMemo(() => students, [students]);

  const totalMales = useMemo(
    () => filteredStudents.filter((s) => s.Sex === "Male" || s.Sex === "M").length,
    [filteredStudents],
  );
  const totalFemales = useMemo(
    () => filteredStudents.filter((s) => s.Sex === "Female" || s.Sex === "F").length,
    [filteredStudents],
  );

  const studentsByGrade = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach((s) => {
      const grade = s.Grade || "Unassigned";
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredStudents]);

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.email),
    [teachers],
  );

  const maxGradeCount = useMemo(
    () => Math.max(...studentsByGrade.map(([, c]) => c), 1),
    [studentsByGrade],
  );

  if (loadingStudents && loadingTeachers) {
    return (
      <ReportPageLayout
        badge="Education"
        title="Academic reports portal"
        subtitle="Loading data..."
        heroGradient="from-emerald-950 via-teal-900 to-cyan-950"
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
      badge="Education"
      title="Academic reports portal"
      subtitle="Student distribution, exports, and teacher (education) accounts — open teacher account management when you need to add or edit logins."
      heroGradient="from-emerald-950 via-teal-900 to-cyan-950"
    >

      <ReportFilters
        grades={GRADE_OPTIONS}
        onFilter={setFilters}
        showAcademicYear
        showGrade
        showDateRange={false}
      />

      {/* Teacher accounts — premium card */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:rounded-3xl sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <GraduationCap className="h-5 w-5 text-emerald-500" />
              Teacher accounts (Education)
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Staff who can enter results and manage classes — same people as in
              Teachers Attendance.
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              label="Excel"
              color="emerald"
              onClick={() =>
                exportToExcel(
                  activeTeachers as unknown[],
                  "Education_Teachers_Accounts",
                )
              }
              disabled={activeTeachers.length === 0 || loadingTeachers}
            />
            <ExportButton
              label="PDF"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: activeTeachers as any[],
                  title: "Education - Teacher Accounts",
                  filename: "Education_Teachers_Accounts_PDF",
                  subtitle: `Total: ${activeTeachers.length} teachers`,
                })
              }
              disabled={activeTeachers.length === 0 || loadingTeachers}
            />
          </div>
        </div>

        {teachersError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {teachersError}
          </div>
        )}

        {loadingTeachers ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : activeTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-600">
              No education teacher accounts found.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Use Teacher account management to add staff.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 text-left text-gray-700">
                  <th className="px-4 py-3 font-semibold sm:px-5">Name</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Email</th>
                  <th className="px-4 py-3 font-semibold sm:px-5">Role</th>
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((t, idx) => (
                  <tr
                    key={t._id}
                    className={`border-t border-gray-50 transition-colors hover:bg-emerald-50/50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 sm:px-5">
                      {t.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 sm:px-5">
                      {t.email}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        {t.role?.replace("Education Facilitator", "Teacher") ??
                          "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Total: {loadingTeachers ? "…" : activeTeachers.length} teacher account
          {activeTeachers.length === 1 ? "" : "s"}
        </p>
      </section>

      <ReportStatGrid>
        <ReportStatCard
          label="Total students"
          value={filteredStudents.length}
          hint="Filtered by grade & year."
          valueClassName="text-emerald-700"
          animate
        />
        <ReportStatCard
          label="Male"
          value={totalMales}
          valueClassName="text-blue-700"
          animate
        />
        <ReportStatCard
          label="Female"
          value={totalFemales}
          valueClassName="text-pink-600"
          animate
        />
        <ReportStatCard
          label="Teacher accounts"
          value={activeTeachers.length}
          hint="Education facilitator role."
          valueClassName="text-teal-700"
          animate
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Distribution by Grade" className="lg:col-span-2">
          {studentsByGrade.length === 0 ? (
            <p className="text-sm text-gray-500">No students found.</p>
          ) : (
            <div className="space-y-3">
              {studentsByGrade.map(([grade, count]) => (
                <div key={grade} className="group flex items-center gap-4">
                  <span className="w-24 text-right text-sm font-semibold text-gray-600">
                    {grade}
                  </span>
                  <div className="flex-1">
                    <div className="h-5 overflow-hidden rounded-full bg-emerald-100 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out"
                        style={{
                          width: `${(count / maxGradeCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-lg font-bold tabular-nums text-gray-800">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-700 bg-gradient-to-b from-gray-900 to-gray-800 p-6 text-white shadow-lg sm:rounded-3xl sm:p-8">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <Download className="h-5 w-5 text-emerald-400" />
              Master Roster Export
            </h3>
            <p className="mb-8 mt-3 text-sm leading-relaxed text-gray-400">
              Download the complete structured data format containing all
              student demographics, historical identifiers, and academic
              groupings perfectly formatted for Excel.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all hover:translate-y-[-1px] hover:bg-emerald-400 hover:shadow-[0_6px_20px_0_rgba(16,185,129,0.5)] active:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              onClick={() =>
                exportToExcel(filteredStudents as unknown[], "Academic_Students_Roster")
              }
              disabled={filteredStudents.length === 0}
            >
              <Download className="h-5 w-5" />
              Excel
            </button>
            <ExportButton
              label="PDF"
              color="gray"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                exportToPDF({
                  data: filteredStudents as any[],
                  title: "Education - Student Roster",
                  filename: "Education_Student_Roster_PDF",
                  subtitle: `Total: ${filteredStudents.length} students`,
                })
              }
              disabled={filteredStudents.length === 0}
            />
          </div>
        </div>
      </div>
    </ReportPageLayout>
  );
}
