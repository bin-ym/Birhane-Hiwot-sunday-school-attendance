"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ReportStatCard,
  ReportStatGrid,
  ReportSection,
  Skeleton,
} from "@/components/reports/ReportPageLayout";
import {
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { safeFetch } from "@/lib/safeFetch";

export default function FacilitatorDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Education Facilitator";
  const grade = session?.user?.grade;
  const isAttendanceFacilitator = !!grade;
  const currentYear = getCurrentEthiopianYear();

  const [studentsCount, setStudentsCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const currentYearStr = String(currentYear);

    const studentsParams = new URLSearchParams({ academicYear: currentYearStr });
    const subjectsParams = new URLSearchParams({ academicYear: currentYearStr });
    if (Array.isArray(grade)) {
      grade.forEach((g) => studentsParams.append("grade", g));
    } else if (grade) {
      studentsParams.append("grade", grade);
    }

    const studentsFetch = safeFetch<any[]>(`/api/students?${studentsParams.toString()}`, []);
    const subjectsFetch = safeFetch<any[]>(`/api/subjects?${subjectsParams.toString()}`, []);

    let attendanceFetch: Promise<{ total?: number; present?: number }> = Promise.resolve({});
    if (isAttendanceFacilitator && grade) {
      const attendanceParams = new URLSearchParams({ summary: "true" });
      if (Array.isArray(grade)) {
        grade.forEach((g) => attendanceParams.append("grade", g));
      } else {
        attendanceParams.append("grade", grade);
      }
      attendanceFetch = safeFetch(`/api/attendance?${attendanceParams.toString()}`, {});
    }

    Promise.all([studentsFetch, subjectsFetch, attendanceFetch])
      .then(([students, subjects, attendance]) => {
        setStudentsCount(Array.isArray(students) ? students.length : 0);
        setSubjectsCount(Array.isArray(subjects) ? subjects.length : 0);
        if (attendance && typeof attendance.total === "number") {
          setPresentCount(attendance.present ?? 0);
          setAbsentCount(attendance.total - (attendance.present ?? 0));
        }
      })
      .finally(() => setLoading(false));
  }, [isAttendanceFacilitator, grade, currentYear]);

  const totalAttendance = presentCount + absentCount;
  const rate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl role-header-gradient p-6 text-white shadow-xl sm:rounded-3xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-white/[0.08] blur-3xl" />
        <div>
          <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
            Education Portal
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Welcome, <span className="font-semibold">{userName}</span>
            {isAttendanceFacilitator && grade && (
              <> · Grades: <span className="font-semibold">{Array.isArray(grade) ? grade.join(", ") : grade}</span></>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          <ReportStatGrid>
            <ReportStatCard
              label="Students"
              value={studentsCount}
              hint={`${currentYear} EC`}
              valueClassName="text-violet-700"
              animate
            />
            <ReportStatCard
              label="Curriculum Subjects"
              value={subjectsCount}
              hint={`${currentYear} EC`}
              valueClassName="text-emerald-600"
              animate
            />
            {isAttendanceFacilitator ? (
              <>
                <ReportStatCard
                  label="Attendance Rate"
                  value={`${rate}%`}
                  hint={`${absentCount} absent`}
                  valueClassName="text-amber-600"
                />
                <ReportStatCard
                  label="Total Marks"
                  value={totalAttendance}
                  valueClassName="text-blue-700"
                  animate
                />
              </>
            ) : (
              <>
                <ReportStatCard
                  label="Active Subjects"
                  value={subjectsCount}
                  hint="Curriculum subjects."
                  valueClassName="text-amber-600"
                  animate
                />
                <ReportStatCard
                  label="Portal Access"
                  value="Full"
                  hint="Cross-grade access"
                  valueClassName="text-blue-700"
                />
              </>
            )}
          </ReportStatGrid>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ReportSection title="Overview" className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-6 p-4">
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-gray-600">
                    {isAttendanceFacilitator
                      ? "Track attendance and manage student results across your assigned grades."
                      : "Manage student academic records, grades, and results across all grades and academic years."}
                  </p>
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                      <p className="text-xs text-gray-500">Students</p>
                      <p className="text-lg font-bold text-violet-600">{studentsCount}</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <p className="text-xs text-gray-500">Subjects</p>
                      <p className="text-lg font-bold text-emerald-600">{subjectsCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ReportSection>

            <div className="rounded-2xl border role-border-accent role-bg-subtle p-6 shadow-sm sm:rounded-3xl sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <BarChart3 className="h-5 w-5" style={{ color: 'var(--role-accent)' }} />
                Quick Actions
              </h3>
              <div className="mt-4 space-y-3">
                <Link href="/facilitator/results/students" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Student Results</p>
                      <p className="text-xs text-gray-500">View and manage academic results</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </Link>
                <Link href="/facilitator/results/subjects" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Manage Subjects</p>
                      <p className="text-xs text-gray-500">Configure curriculum subjects</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </Link>
                <Link href="/facilitator/results/reports" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Reports</p>
                      <p className="text-xs text-gray-500">Academic analytics and exports</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
