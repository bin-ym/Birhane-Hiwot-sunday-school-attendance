"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ReportStatCard,
  ReportStatGrid,
  ReportSection,
  DonutChart,
  ProgressBar,
  Skeleton,
} from "@/components/reports/ReportPageLayout";
import {
  GraduationCap,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { safeFetch } from "@/lib/safeFetch";

export default function EducationAdminDashboard() {
  const [studentsCount, setStudentsCount] = useState(0);
  const [teachersCount, setTeachersCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      safeFetch<{ total?: number }>('/api/students/total', {}),
      safeFetch<any[]>('/api/education-facilitators', []),
      safeFetch<any[]>('/api/subjects', []),
    ]).then(([s, f, sub]) => {
      setStudentsCount(s?.total ?? 0);
      setTeachersCount(Array.isArray(f) ? f.length : 0);
      setSubjectsCount(Array.isArray(sub) ? sub.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl role-header-gradient p-6 text-white shadow-xl sm:rounded-3xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-white/[0.08] blur-3xl" />
        <div>
          <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
            Education Admin Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Overview of students, teachers, subjects, and academic results.
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
              hint="All academic years."
              valueClassName="text-emerald-700"
              animate
            />
            <ReportStatCard
              label="Teachers"
              value={teachersCount}
              hint="Education facilitator accounts."
              valueClassName="text-teal-600"
              animate
            />
            <ReportStatCard
              label="Subjects"
              value={subjectsCount}
              hint="Curriculum subjects."
              valueClassName="text-cyan-600"
              animate
            />
            <ReportStatCard
              label="Reports"
              value="6"
              hint="Available report types."
              valueClassName="text-gray-800"
              animate
            />
          </ReportStatGrid>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ReportSection title="Academic Overview" className="lg:col-span-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Students</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-emerald-700">{studentsCount}</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Teachers</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-teal-700">{teachersCount}</p>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Subjects</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-cyan-700">{subjectsCount}</p>
                </div>
              </div>
            </ReportSection>

            <div className="rounded-2xl border role-border-accent role-bg-subtle p-6 shadow-sm sm:rounded-3xl sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <BarChart3 className="h-5 w-5" style={{ color: 'var(--role-accent)' }} />
                Quick Links
              </h3>
              <div className="mt-4 space-y-3">
                <Link href="/education" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Education Overview</p>
                      <p className="text-xs text-gray-500">Students, teachers, and subjects</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </Link>
                <Link href="/education/reports" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Reports</p>
                      <p className="text-xs text-gray-500">Academic reports and exports</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                  </div>
                </Link>
                <Link href="/education/manage-facilitators" className="group block">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Manage Teachers</p>
                      <p className="text-xs text-gray-500">Add or edit teacher accounts</p>
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
