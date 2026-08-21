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
  Shield,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { safeFetch } from "@/lib/safeFetch";

export default function SuperAdminDashboardPage() {
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

  const statLinks = [
    {
      href: "/super-admin/department-admins",
      icon: <Shield className="h-5 w-5" />,
      label: "Department Admins",
      desc: "Allocate keys to your highest HR and Education hierarchies",
    },
    {
      href: "/super-admin/facilitators",
      icon: <Users className="h-5 w-5" />,
      label: "Global Facilitators",
      desc: "Cross-departmental view of facilitator accounts",
    },
    {
      href: "/super-admin/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Reports & Analytics",
      desc: "Open cross-sectional reports on attendance and engagement",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden role-header-gradient px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-white/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 animate-pulse rounded-full bg-white/[0.04] blur-3xl" style={{ animationDelay: "1.5s" }} />
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Super Admin Control Hub
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Control the backbone of your platform. Access global roles, manage
            high-level permissions, and oversee reporting metrics securely.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16 pt-8 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            <ReportStatGrid>
              <ReportStatCard
                label="Total Students"
                value={studentsCount}
                hint="All years combined."
                valueClassName="text-gray-900"
                animate
              />
              <ReportStatCard
                label="Facilitators"
                value={facilitatorsCount}
                hint="All facilitator accounts."
                valueClassName="text-blue-600"
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
                hint="Total marks logged."
                valueClassName="text-purple-600"
                animate
              />
            </ReportStatGrid>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ReportSection title="Attendance Analytics" className="lg:col-span-2">
                <div className="flex flex-wrap items-center gap-8">
                  <DonutChart
                    value={presentCount}
                    max={totalAttendance}
                    size={130}
                    strokeWidth={10}
                    color="#6366f1"
                    label="Rate"
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
                  {statLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="group block">
                      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 role-link-hover">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg role-icon-bg">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
