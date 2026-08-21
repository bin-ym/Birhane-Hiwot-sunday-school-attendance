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
  Users,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  UserPlus,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { safeFetch } from "@/lib/safeFetch";

export default function AdminDashboard() {
  const [studentsCount, setStudentsCount] = useState(0);
  const [facilitatorsCount, setFacilitatorsCount] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      safeFetch<{ total?: number }>('/api/students/total', {}),
      safeFetch<{ total?: number }>('/api/facilitators/total', {}),
      safeFetch<{ total?: number; present?: number }>('/api/attendance?summary=true', {}),
    ]).then(([s, f, a]) => {
      setStudentsCount(s?.total ?? 0);
      setFacilitatorsCount(f?.total ?? 0);
      setTotalAttendance(a?.total ?? 0);
      setPresentCount(a?.present ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  const absentCount = totalAttendance - presentCount;
  const rate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="rounded-2xl role-header-gradient p-6 text-white shadow-xl sm:rounded-3xl sm:p-8 lg:p-10">
        <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/80 sm:text-base">
          Overview of your students, facilitators, and attendance metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <ReportStatGrid>
        <ReportStatCard
          label="Total Students"
          value={studentsCount}
          hint="All time registered students."
          valueClassName="text-blue-700"
          animate
        />
        <ReportStatCard
          label="Facilitators"
          value={facilitatorsCount}
          hint="Active facilitator accounts."
          valueClassName="text-emerald-700"
          animate
        />
        <ReportStatCard
          label="Attendance Rate"
          value={`${rate}%`}
          hint="Present ÷ total marks."
          valueClassName="text-amber-600"
        />
        <ReportStatCard
          label="Attendance Rows"
          value={totalAttendance}
          hint="Individual attendance marks."
          valueClassName="text-violet-700"
          animate
        />
      </ReportStatGrid>

      {/* Charts + Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Attendance Overview" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-8">
            <DonutChart
              value={presentCount}
              max={totalAttendance}
              size={130}
              strokeWidth={10}
              color="#6366f1"
              label="Present rate"
            />
            <div className="flex-1 space-y-4">
              <ProgressBar value={presentCount} max={totalAttendance} color="violet" />
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-lg font-bold text-emerald-600">{presentCount}</p>
                </div>
                <div className="flex-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-lg font-bold text-red-600">{absentCount}</p>
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
            <QuickLink
              href="/admin/students"
              icon={<Users className="h-4 w-4" />}
              label="Manage Students"
              desc="Add, edit, or export student records"
            />
            <QuickLink
              href="/admin/facilitators"
              icon={<GraduationCap className="h-4 w-4" />}
              label="Manage Facilitators"
              desc="Assign roles and grades"
            />
            <QuickLink
              href="/admin/reports"
              icon={<BarChart3 className="h-4 w-4" />}
              label="View Reports"
              desc="Attendance, results, and analytics"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {label}
          </p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
      </div>
    </Link>
  );
}
