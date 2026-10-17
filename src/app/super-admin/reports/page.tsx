"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Student, User, Attendance, StudentClassification } from "@/lib/models";
import { GRADE_OPTIONS, STUDENT_CLASSIFICATIONS } from "@/lib/constants";
import {
  academicYearMatchesEthiopian,
  getCurrentEthiopianYear,
  isCategoryRegistrationOpen,
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
} from "@/components/reports/ReportPageLayout";
import {
  Users,
  GraduationCap,
  Activity,
  Calendar,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileText,
  Clock,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

interface CategoryPeriodItem {
  _id?: string;
  classification: StudentClassification;
  academicYear: string;
  startDate: string;
  endDate: string;
  registrationClosedDate: string;
  isActive: boolean;
}

interface PaymentRecord {
  _id?: string;
  studentId: string;
  academicYear: string;
  data: Record<string, string | { status: string; amount?: string }>;
}

export default function SuperAdminReportsDashboard() {
  const currentEcYear = getCurrentEthiopianYear();

  // Raw fetched data
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [periods, setPeriods] = useState<CategoryPeriodItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(String(currentEcYear));
  const [selectedClassification, setSelectedClassification] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const loadAllData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const [s, f, a, p, pay] = await Promise.all([
        safeFetch<Student[]>("/api/v1/students", []),
        safeFetch<User[]>("/api/v1/facilitators", []),
        safeFetch<Attendance[]>("/api/v1/attendance", []),
        safeFetch<CategoryPeriodItem[]>("/api/v1/category-periods", []),
        safeFetch<PaymentRecord[]>(`/api/v1/payment?year=${selectedYear || currentEcYear}`, []),
      ]);

      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
      setAttendance(Array.isArray(a) ? a : []);
      setPeriods(Array.isArray(p) ? p : []);
      setPayments(Array.isArray(pay) ? pay : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, currentEcYear]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // When selectedYear changes, refresh payments for that year
  useEffect(() => {
    if (selectedYear) {
      safeFetch<PaymentRecord[]>(`/api/v1/payment?year=${selectedYear}`, []).then((pay) => {
        setPayments(Array.isArray(pay) ? pay : []);
      });
    }
  }, [selectedYear]);

  // Distinct academic years from students and periods
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    students.forEach((s) => {
      if (s.Academic_Year) yearsSet.add(String(s.Academic_Year).trim());
    });
    periods.forEach((p) => {
      if (p.academicYear) yearsSet.add(String(p.academicYear).trim());
    });
    yearsSet.add(String(currentEcYear));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students, periods, currentEcYear]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedYear && String(s.Academic_Year).trim() !== selectedYear) return false;
      if (selectedClassification && (s.Classification || "Regular") !== selectedClassification)
        return false;
      if (selectedGrade && s.Grade !== selectedGrade) return false;
      return true;
    });
  }, [students, selectedYear, selectedClassification, selectedGrade]);

  // Student IDs set for attendance & payment matching
  const filteredStudentIds = useMemo(() => {
    return new Set(filteredStudents.map((s) => s.Unique_ID || String(s._id)));
  }, [filteredStudents]);

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      // If we filtered students by year/grade/classification, only consider matching students
      if (
        (selectedYear || selectedClassification || selectedGrade) &&
        !filteredStudentIds.has(a.studentId)
      ) {
        return false;
      }
      if (dateFrom && new Date(a.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(a.date) > to) return false;
      }
      return true;
    });
  }, [attendance, filteredStudentIds, selectedYear, selectedClassification, selectedGrade, dateFrom, dateTo]);

  // Attendance metrics
  const totalAttendanceRecords = filteredAttendance.length;
  const presentAttendanceRecords = filteredAttendance.filter((x) => x.present).length;
  const absentAttendanceRecords = totalAttendanceRecords - presentAttendanceRecords;
  const overallAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
      : 0;

  // Student demographic breakdown
  const maleStudents = filteredStudents.filter(
    (s) => s.Sex?.toLowerCase() === "male" || s.Sex?.toLowerCase() === "ወንድ",
  ).length;
  const femaleStudents = filteredStudents.filter(
    (s) => s.Sex?.toLowerCase() === "female" || s.Sex?.toLowerCase() === "ሴት",
  ).length;
  const otherSexStudents = filteredStudents.length - maleStudents - femaleStudents;

  // Classification breakdown
  const classificationCounts = useMemo(() => {
    const map: Record<string, number> = {
      Regular: 0,
      Extension: 0,
      SignLanguage: 0,
      Summer: 0,
      begena: 0,
    };
    filteredStudents.forEach((s) => {
      const cls = s.Classification || "Regular";
      map[cls] = (map[cls] || 0) + 1;
    });
    return map;
  }, [filteredStudents]);

  // Grade breakdown
  const gradeDistribution = useMemo(() => {
    const map: Record<string, { total: number; male: number; female: number }> = {};
    GRADE_OPTIONS.forEach((g) => {
      map[g.value] = { total: 0, male: 0, female: 0 };
    });

    filteredStudents.forEach((s) => {
      const g = s.Grade || "Unassigned";
      if (!map[g]) map[g] = { total: 0, male: 0, female: 0 };
      map[g].total++;
      if (s.Sex?.toLowerCase() === "male" || s.Sex?.toLowerCase() === "ወንድ") map[g].male++;
      else if (s.Sex?.toLowerCase() === "female" || s.Sex?.toLowerCase() === "ሴት") map[g].female++;
    });

    return Object.entries(map)
      .map(([grade, counts]) => ({ grade, ...counts }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredStudents]);

  // Attendance rate by Grade
  const gradeAttendanceStats = useMemo(() => {
    // Map studentId -> Grade
    const studentGradeMap = new Map<string, string>();
    students.forEach((s) => {
      studentGradeMap.set(s.Unique_ID, s.Grade);
      studentGradeMap.set(String(s._id), s.Grade);
    });

    const map: Record<string, { present: number; total: number }> = {};
    filteredAttendance.forEach((a) => {
      const g = studentGradeMap.get(a.studentId) || (a as any).grade;
      if (!g) return;
      if (!map[g]) map[g] = { present: 0, total: 0 };
      map[g].total++;
      if (a.present) map[g].present++;
    });

    return Object.entries(map)
      .map(([grade, stats]) => ({
        grade,
        present: stats.present,
        total: stats.total,
        rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredAttendance, students]);

  const highestAttendedGrade = gradeAttendanceStats[0];
  const lowestAttendedGrade =
    gradeAttendanceStats.length > 1
      ? gradeAttendanceStats[gradeAttendanceStats.length - 1]
      : null;

  // Payment statistics
  const paymentMetrics = useMemo(() => {
    let totalMonthEntries = 0;
    let paidMonthEntries = 0;

    payments.forEach((p) => {
      if (!p.data) return;
      Object.values(p.data).forEach((val) => {
        totalMonthEntries++;
        if (typeof val === "string" && val === "Paid") paidMonthEntries++;
        else if (typeof val === "object" && val?.status === "Paid") paidMonthEntries++;
      });
    });

    const unpaidMonthEntries = totalMonthEntries - paidMonthEntries;
    const paymentRate =
      totalMonthEntries > 0 ? Math.round((paidMonthEntries / totalMonthEntries) * 100) : 0;

    return {
      totalRecords: payments.length,
      totalMonthEntries,
      paidMonthEntries,
      unpaidMonthEntries,
      paymentRate,
    };
  }, [payments]);

  // Facilitator counts
  const totalEducationFacilitators = facilitators.filter(
    (f) => f.role === "Education Facilitator" || f.role === "Education Admin",
  ).length;
  const totalAttendanceFacilitators = facilitators.filter(
    (f) => f.role === "Attendance Facilitator",
  ).length;

  // Registration period open/close status
  const currentYearPeriods = useMemo(() => {
    return periods.filter(
      (p) => !selectedYear || String(p.academicYear).trim() === selectedYear,
    );
  }, [periods, selectedYear]);

  const activePeriodsCount = periods.filter((p) => p.isActive).length;
  const openCategoriesCount = STUDENT_CLASSIFICATIONS.filter((cat) => {
    const period = periods.find(
      (p) =>
        p.classification === cat.value &&
        (!selectedYear || String(p.academicYear) === selectedYear),
    );
    return isCategoryRegistrationOpen(period);
  }).length;

  if (loading) {
    return (
      <ReportPageLayout
        badge="Super Admin Analytics"
        title="System Intelligence & Reports"
        subtitle="Aggregating live database metrics across enrollment, attendance, finances, and admissions..."
        heroGradient="from-slate-950 via-indigo-950 to-violet-950"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </ReportPageLayout>
    );
  }

  return (
    <ReportPageLayout
      badge="Super Admin Analytics"
      title="System Intelligence & Reports"
      subtitle="Comprehensive insights driven by live database records covering students, attendance, payments, and registration windows."
      heroGradient="from-slate-950 via-indigo-950 to-violet-950"
    >
      {/* Interactive Drill-Down Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Interactive Report Filters
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Academic Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} EC {y === String(currentEcYear) ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Classification Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Category
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {STUDENT_CLASSIFICATIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Grade Level
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Grades</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2 pt-4 lg:pt-0">
              <button
                onClick={() => {
                  setSelectedYear(String(currentEcYear));
                  setSelectedClassification("");
                  setSelectedGrade("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                title="Reset filters to current year"
              >
                Reset
              </button>
              <button
                onClick={() => loadAllData(false)}
                disabled={refreshing}
                className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                title="Refresh database records"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Level KPIs */}
      <ReportStatGrid>
        <ReportStatCard
          label="Total Students (Filtered)"
          value={filteredStudents.length}
          hint={`${maleStudents} Male (${filteredStudents.length > 0 ? Math.round((maleStudents / filteredStudents.length) * 100) : 0}%) • ${femaleStudents} Female`}
          valueClassName="text-gray-900"
          animate
        />
        <ReportStatCard
          label="Overall Attendance Rate"
          value={`${overallAttendanceRate}%`}
          hint={`${presentAttendanceRecords} Present of ${totalAttendanceRecords} Sessions`}
          valueClassName="text-emerald-600"
          animate
        />
        <ReportStatCard
          label="Payment Collection Rate"
          value={`${paymentMetrics.paymentRate}%`}
          hint={`${paymentMetrics.paidMonthEntries} Paid / ${paymentMetrics.totalMonthEntries} Months (${selectedYear || "All"} EC)`}
          valueClassName="text-purple-600"
          animate
        />
        <ReportStatCard
          label="Active Admissions"
          value={openCategoriesCount}
          hint={`Of ${STUDENT_CLASSIFICATIONS.length} Categories Open for Registration`}
          valueClassName="text-blue-600"
          animate
        />
      </ReportStatGrid>

      {/* Classification Breakdown & Admission Window Status */}
      <ReportSection title="Student Classification & Admission Status">
        <p className="mb-4 text-xs text-gray-500">
          Distribution across regular, distance, sign language, summer, and instrument programs with live admission window checks.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STUDENT_CLASSIFICATIONS.map((cat) => {
            const count = classificationCounts[cat.value] || 0;
            const pct =
              filteredStudents.length > 0
                ? Math.round((count / filteredStudents.length) * 100)
                : 0;
            const period = periods.find(
              (p) =>
                p.classification === cat.value &&
                (!selectedYear || String(p.academicYear) === selectedYear),
            );
            const isOpen = isCategoryRegistrationOpen(period);

            return (
              <div
                key={cat.value}
                className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{cat.label}</span>
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Closed
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{count}</span>
                  <span className="text-xs font-semibold text-gray-400">{pct}%</span>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <p className="mt-2 text-[10px] text-gray-400 line-clamp-1">{cat.description}</p>
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* Attendance & Performance Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Visualizer */}
        <ReportSection title="Attendance Volume & Rate" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-8">
            <DonutChart
              value={presentAttendanceRecords}
              max={totalAttendanceRecords}
              size={150}
              strokeWidth={14}
              color="#4f46e5"
              label="Present Rate"
            />

            <div className="flex-1 space-y-4 min-w-[240px]">
              <ProgressBar
                value={presentAttendanceRecords}
                max={totalAttendanceRecords}
                color="violet"
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Present Sessions
                  </p>
                  <p className="mt-1 text-xl font-black text-emerald-700">
                    {presentAttendanceRecords}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                    Absent Sessions
                  </p>
                  <p className="mt-1 text-xl font-black text-rose-700">
                    {absentAttendanceRecords}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Present Rate
                  </p>
                  <p className="mt-1 text-xl font-black text-gray-800">
                    {overallAttendanceRate}%
                  </p>
                </div>
              </div>

              {/* Class Highlights */}
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                {highestAttendedGrade && (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50/70 p-2.5 text-xs text-indigo-900 border border-indigo-100">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Top Attended:</span> {highestAttendedGrade.grade} ({highestAttendedGrade.rate}%)
                    </div>
                  </div>
                )}
                {lowestAttendedGrade && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 p-2.5 text-xs text-rose-900 border border-rose-100">
                    <ArrowDownRight className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Lowest:</span> {lowestAttendedGrade.grade} ({lowestAttendedGrade.rate}%)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Financial & Staff Metrics */}
        <ReportSection title="Payments & Staffing">
          <div className="space-y-4">
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  Monthly Fee Status
                </span>
                <span className="text-sm font-black text-purple-700">
                  {paymentMetrics.paymentRate}%
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-purple-800">
                <span>{paymentMetrics.paidMonthEntries} Paid</span>
                <span>{paymentMetrics.unpaidMonthEntries} Pending</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-purple-200">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${paymentMetrics.paymentRate}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gray-400" />
                Education Facilitators
              </span>
              <span className="text-sm font-bold text-gray-900">
                {totalEducationFacilitators}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                Attendance Facilitators
              </span>
              <span className="text-sm font-bold text-gray-900">
                {totalAttendanceFacilitators}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                Configured Periods
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">{activePeriodsCount} Active</span>
                <Link
                  href="/super-admin/registration-periods"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold ml-1 inline-flex items-center"
                >
                  Manage <ExternalLink className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </ReportSection>
      </div>

      {/* Grade Enrollment Breakdown Table */}
      <ReportSection title="Enrollment by Grade / Class">
        <p className="mb-4 text-xs text-gray-500">
          Student count and gender balance across all active classes for {selectedYear || "All"} EC.
        </p>

        {gradeDistribution.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No students found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Grade Level</th>
                  <th className="px-4 py-3">Total Students</th>
                  <th className="px-4 py-3">Male</th>
                  <th className="px-4 py-3">Female</th>
                  <th className="px-4 py-3">Cohort Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeDistribution.map((row) => {
                  const share =
                    filteredStudents.length > 0
                      ? Math.round((row.total / filteredStudents.length) * 100)
                      : 0;

                  return (
                    <tr key={row.grade} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">{row.grade}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{row.total}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{row.male}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{row.female}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-500">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      {/* Database Raw Exports */}
      <ReportSection title="Database Exports">
        <p className="mb-4 text-xs text-gray-600">
          Download real filtered records directly for administrative offline backups or compliance auditing.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Students Export */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Filtered Students
            </span>
            <p className="text-2xl font-black text-gray-900 mt-1">{filteredStudents.length}</p>
            <div className="mt-3 flex gap-2">
              <ExportButton
                label="Excel"
                color="gray"
                onClick={() =>
                  exportToExcel(
                    filteredStudents.map((s) => ({
                      ID: s.Unique_ID,
                      Name: `${s.First_Name} ${s.Father_Name} ${s.Grandfather_Name}`,
                      Christian_Name: s.Christian_Name || "",
                      Grade: s.Grade,
                      Academic_Year: s.Academic_Year,
                      Classification: s.Classification || "Regular",
                      Sex: s.Sex,
                      Age: s.Age,
                      Phone: s.Phone_Number,
                    })),
                    "Filtered_Students_Report",
                  )
                }
                disabled={filteredStudents.length === 0}
              />
              <ExportButton
                label="PDF"
                color="gray"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  exportToPDF({
                    data: filteredStudents as any[],
                    title: "Student Records Export",
                    filename: "Students_PDF",
                    subtitle: `Year: ${selectedYear || "All"} | Total: ${filteredStudents.length}`,
                  })
                }
                disabled={filteredStudents.length === 0}
              />
            </div>
          </div>

          {/* Facilitators Export */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Facilitator Staff
            </span>
            <p className="text-2xl font-black text-blue-700 mt-1">{facilitators.length}</p>
            <div className="mt-3 flex gap-2">
              <ExportButton
                label="Excel"
                color="blue"
                onClick={() =>
                  exportToExcel(
                    facilitators.map((f) => ({
                      Name: f.name || f.email,
                      Email: f.email,
                      Role: f.role,
                      AssignedGrade: Array.isArray(f.grade) ? f.grade.join(", ") : f.grade || "",
                    })),
                    "Facilitators_Staff_Report",
                  )
                }
                disabled={facilitators.length === 0}
              />
              <ExportButton
                label="PDF"
                color="blue"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  exportToPDF({
                    data: facilitators as any[],
                    title: "Facilitators Staff List",
                    filename: "Facilitators_PDF",
                    subtitle: `Total: ${facilitators.length} facilitators`,
                  })
                }
                disabled={facilitators.length === 0}
              />
            </div>
          </div>

          {/* Attendance Export */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Filtered Attendance Log
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {filteredAttendance.length}
            </p>
            <div className="mt-3 flex gap-2">
              <ExportButton
                label="Excel"
                color="emerald"
                onClick={() =>
                  exportToExcel(
                    filteredAttendance.map((a) => ({
                      Date: a.date,
                      StudentID: a.studentId,
                      Present: a.present ? "Yes" : "No",
                      Reason: a.reason || "",
                    })),
                    "Attendance_Logs_Report",
                  )
                }
                disabled={filteredAttendance.length === 0}
              />
              <ExportButton
                label="PDF"
                color="emerald"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  exportToPDF({
                    data: filteredAttendance.map((a) => ({
                      Date: a.date,
                      StudentID: a.studentId,
                      Present: a.present ? "Yes" : "No",
                      Reason: a.reason || "",
                    })),
                    title: "Attendance Logs",
                    filename: "Attendance_PDF",
                    subtitle: `Rows: ${filteredAttendance.length}`,
                  })
                }
                disabled={filteredAttendance.length === 0}
              />
            </div>
          </div>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
