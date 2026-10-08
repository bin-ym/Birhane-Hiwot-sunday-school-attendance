"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { GRADE_OPTIONS, STUDENT_CLASSIFICATIONS } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
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
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  BookOpen,
  Award,
  Printer,
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  BarChart3,
  UserCheck,
  Percent,
} from "lucide-react";
import { exportToExcel, exportMultiSheetToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";
import { EthiopianDatePicker } from "@/components/calendar/EthiopianDatePicker";

type ReportTab = "overview" | "attendance" | "payments" | "results" | "staff";

interface ReportData {
  summary: {
    totalStudentsAllYears: number;
    totalStudentsFiltered: number;
    totalStudentsCurrentEC: number;
    attendanceStats: {
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      presentRate: number;
    };
    paymentStats: {
      totalEvaluated: number;
      paidCount: number;
      unpaidCount: number;
      partialCount: number;
      collectionRate: number;
    };
    resultsStats: {
      totalResults: number;
      averageScore: number;
      passingRate: number;
      passCount: number;
      failCount: number;
    };
    staffStats: {
      totalStaff: number;
      educationFacilitators: number;
      attendanceFacilitators: number;
      admins: number;
    };
  };
  demographics: {
    studentsByGrade: Array<{
      grade: string;
      count: number;
      maleCount: number;
      femaleCount: number;
      percentage: number;
    }>;
    studentsByYear: Array<{
      academicYear: string;
      count: number;
      percentage: number;
    }>;
    studentsByClassification: Array<{
      classification: string;
      count: number;
      percentage: number;
    }>;
    gender: {
      male: number;
      female: number;
      malePercentage: number;
      femalePercentage: number;
    };
    rawStudents: Array<{
      _id: string;
      uniqueId: string;
      name: string;
      grade: string;
      academicYear: string;
      classification: string;
      sex: string;
      age: string | number;
      phoneNumber: string;
    }>;
  };
  attendanceAnalytics: {
    byGrade: Array<{
      grade: string;
      total: number;
      present: number;
      absent: number;
      rate: number;
    }>;
    frequentAbsences: Array<{
      studentId: string;
      uniqueId: string;
      name: string;
      grade: string;
      academicYear: string;
      absentCount: number;
      presentCount: number;
      totalRecorded: number;
      absentRate: number;
      isHighRisk: boolean;
      lastRecordedDate: string;
    }>;
    totalFrequentAbsentCount: number;
  };
  paymentAnalytics: {
    byGrade: Array<{
      grade: string;
      total: number;
      paid: number;
      unpaid: number;
      rate: number;
    }>;
    studentsPaymentList: Array<{
      studentId: string;
      uniqueId: string;
      name: string;
      grade: string;
      academicYear: string;
      paidMonthsCount: number;
      unpaidMonthsCount: number;
      overallStatus: "Paid" | "Unpaid" | "Partial";
      monthsSummary: string;
    }>;
    paidVsUnpaid: {
      paid: number;
      unpaid: number;
      partial: number;
    };
  };
  performanceAnalytics: {
    byGrade: Array<{
      grade: string;
      resultsCount: number;
      avgScore: number;
      passCount: number;
      failCount: number;
      passRate: number;
    }>;
    gradeDistribution: Array<{
      letter: string;
      count: number;
    }>;
    topPerformers: Array<{
      studentId: string;
      studentName: string;
      grade: string;
      subjectName: string;
      totalScore: number;
      letterGrade: string;
    }>;
    needsSupport: Array<{
      studentId: string;
      studentName: string;
      grade: string;
      subjectName: string;
      totalScore: number;
      letterGrade: string;
    }>;
    rawResults: Array<{
      _id: string;
      studentId: string;
      studentName: string;
      subjectName: string;
      academicYear: string;
      totalScore: number;
      letterGrade: string;
      recordedDate: string;
    }>;
  };
  facilitatorActivity: {
    coverage: Array<{
      grade: string;
      facilitatorCount: number;
      hasFacilitator: boolean;
      facilitators: Array<{ name: string; email: string; role: string }>;
    }>;
    staffList: Array<{
      _id: string;
      name: string;
      email: string;
      role: string;
      assignedGrades: string[];
      attendanceMarksCount: number;
    }>;
    byRole: Array<{
      role: string;
      count: number;
    }>;
  };
  metadata: {
    academicYears: string[];
    grades: Array<{ value: string; label: string; number: number }>;
    currentEthiopianYear: number;
    generatedAt: string;
  };
}

export default function SuperAdminReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  // Filter state
  const [academicYear, setAcademicYear] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classification, setClassification] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append("academicYear", academicYear);
      if (grade) params.append("grade", grade);
      if (classification) params.append("classification", classification);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const qs = params.toString();
      const endpoint = `/api/reports/super-admin${qs ? `?${qs}` : ""}`;
      const res = await safeFetch<ReportData>(endpoint, null as unknown as ReportData);
      if (res && res.summary) {
        setData(res);
      } else {
        setError("Unable to load reports data. Please ensure you have Super Admin permissions.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [academicYear, grade, classification, dateFrom, dateTo]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Reset filters
  const handleResetFilters = () => {
    setAcademicYear("");
    setGrade("");
    setClassification("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const hasActiveFilters = Boolean(academicYear || grade || classification || dateFrom || dateTo || searchQuery);

  const activeFilterObj = useMemo(
    () => ({
      "Academic Year": academicYear ? `${academicYear} EC` : "All Years",
      Grade: grade || "All Grades",
      Classification: classification || "All Classifications",
      "Date Range":
        dateFrom || dateTo
          ? `${dateFrom || "Start"} to ${dateTo || "Present"}`
          : "All Time",
    }),
    [academicYear, grade, classification, dateFrom, dateTo],
  );

  const handleMasterExcelExport = () => {
    if (!data) return;
    const sheets = [
      {
        sheetName: "Students Roster",
        title: "Enrolled Students Roster",
        filters: activeFilterObj,
        data: (data.demographics.rawStudents || []).map((s) => ({
          "Unique ID": s.uniqueId,
          "Full Name": s.name,
          Grade: s.grade,
          "Academic Year": s.academicYear ? `${s.academicYear} EC` : "—",
          Classification: s.classification,
          Sex: s.sex,
          Age: s.age ?? "—",
          "Phone Number": s.phoneNumber,
        })),
      },
      {
        sheetName: "Frequent Absences",
        title: "At-Risk Attendance & Frequent Absences",
        filters: activeFilterObj,
        data: (data.attendanceAnalytics.frequentAbsences || []).map((s) => ({
          "Unique ID": s.uniqueId,
          "Student Name": s.name,
          Grade: s.grade,
          "Academic Year": s.academicYear ? `${s.academicYear} EC` : "—",
          "Absent Count": s.absentCount,
          "Present Count": s.presentCount,
          "Total Recorded": s.totalRecorded,
          "Absence Rate": `${s.absentRate}%`,
          "High Risk (3+)": s.isHighRisk ? "YES" : "NO",
          "Last Recorded Date": s.lastRecordedDate,
        })),
      },
      {
        sheetName: "Payment Compliance",
        title: "Student Payment Compliance",
        filters: activeFilterObj,
        data: (data.paymentAnalytics.studentsPaymentList || []).map((p) => ({
          "Unique ID": p.uniqueId,
          "Student Name": p.name,
          Grade: p.grade,
          "Academic Year": p.academicYear ? `${p.academicYear} EC` : "—",
          "Overall Status": p.overallStatus,
          "Months Paid": p.paidMonthsCount,
          "Unpaid Months": p.unpaidMonthsCount,
          "Compliance Breakdown": p.monthsSummary,
        })),
      },
      {
        sheetName: "Academic Results",
        title: "Student Academic Results",
        filters: activeFilterObj,
        data: (data.performanceAnalytics.rawResults || []).map((r) => ({
          "Student Name": r.studentName,
          Subject: r.subjectName,
          "Academic Year": r.academicYear ? `${r.academicYear} EC` : "—",
          "Total Score": r.totalScore,
          "Letter Grade": r.letterGrade,
          "Evaluation Date": r.recordedDate,
        })),
      },
      {
        sheetName: "Staff Activity",
        title: "Staff and Facilitators Directory",
        filters: activeFilterObj,
        data: (data.facilitatorActivity.staffList || []).map((st) => ({
          "Staff Name": st.name,
          "Email Address": st.email,
          "System Role": st.role,
          "Assigned Grades": st.assignedGrades.join(", ") || "—",
          "Attendance Marks Logged": st.attendanceMarksCount,
        })),
      },
    ].filter((s) => s.data.length > 0);

    exportMultiSheetToExcel(
      sheets,
      `Birhane_Hiwot_Master_Executive_Report_${academicYear || ecYear}`,
    );
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Filtered lists based on search query
  const filteredFrequentAbsences = useMemo(() => {
    if (!data?.attendanceAnalytics?.frequentAbsences) return [];
    if (!searchQuery.trim()) return data.attendanceAnalytics.frequentAbsences;
    const q = searchQuery.toLowerCase();
    return data.attendanceAnalytics.frequentAbsences.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.uniqueId.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const filteredStudentPayments = useMemo(() => {
    if (!data?.paymentAnalytics?.studentsPaymentList) return [];
    if (!searchQuery.trim()) return data.paymentAnalytics.studentsPaymentList;
    const q = searchQuery.toLowerCase();
    return data.paymentAnalytics.studentsPaymentList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.uniqueId.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.overallStatus.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const filteredStaffList = useMemo(() => {
    if (!data?.facilitatorActivity?.staffList) return [];
    if (!searchQuery.trim()) return data.facilitatorActivity.staffList;
    const q = searchQuery.toLowerCase();
    return data.facilitatorActivity.staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.assignedGrades.some((g) => g.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const filteredRawStudents = useMemo(() => {
    if (!data?.demographics?.rawStudents) return [];
    if (!searchQuery.trim()) return data.demographics.rawStudents;
    const q = searchQuery.toLowerCase();
    return data.demographics.rawStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.uniqueId.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.phoneNumber.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Max grade count for visual percentage bars
  const maxGradeStudentCount = useMemo(() => {
    if (!data?.demographics?.studentsByGrade) return 1;
    return Math.max(...data.demographics.studentsByGrade.map((g) => g.count), 1);
  }, [data]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <ReportPageLayout
        badge="Super Admin"
        title="System Intelligence & Analytics"
        subtitle="Loading comprehensive system report across students, attendance, payments, academic results, and staff..."
        heroGradient="from-gray-950 via-zinc-900 to-indigo-950"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="mt-8 space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </ReportPageLayout>
    );
  }

  const s = data?.summary;

  return (
    <ReportPageLayout
      badge="Super Admin"
      title="System Intelligence & Analytics"
      subtitle={`Comprehensive institution-wide reporting across students, attendance tracking, financial collections, academic performance, and facilitator operations for ${academicYear ? `${academicYear} EC` : "all years"}.`}
      heroGradient="from-gray-950 via-zinc-900 to-indigo-950"
    >
      {/* ─── Top Control Bar: Print, Refresh, Actions ─── */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Data
          </span>
          {data?.metadata?.generatedAt && (
            <span className="text-xs text-gray-400">
              Updated: {new Date(data.metadata.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:translate-y-0 disabled:opacity-50"
            title="Refresh latest metrics from database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : "text-gray-500"}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:translate-y-0"
            title="Print-friendly view or Save to PDF"
          >
            <Printer className="h-3.5 w-3.5 text-gray-500" />
            Print Report
          </button>
          <ExportButton
            label="Master Excel Export"
            color="indigo"
            onClick={handleMasterExcelExport}
            disabled={!data || data.demographics.rawStudents.length === 0}
          />
        </div>
      </div>

      {/* ─── Error Notification ─── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Global Filter Bar ─── */}
      <div className="print:hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between border-b border-gray-50 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Filter className="h-3.5 w-3.5 text-indigo-500" />
            Report Filters & Scopes
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Academic Year Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Academic Years</option>
              {data?.metadata?.academicYears?.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} EC {yr === String(ecYear) ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Grade Scope
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Grades</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Classification
            </label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Classifications</option>
              {STUDENT_CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div className="min-w-[170px]">
            <EthiopianDatePicker
              label="Date From (ከቀን)"
              value={dateFrom}
              onChange={(val) => setDateFrom(val)}
              placeholder="የመጀመሪያ ቀን"
            />
          </div>

          {/* Date Range: To */}
          <div className="min-w-[170px]">
            <EthiopianDatePicker
              label="Date To (እስከ ቀን)"
              value={dateTo}
              onChange={(val) => setDateTo(val)}
              placeholder="የመጨረሻ ቀን"
            />
          </div>
        </div>

        {/* Search query box */}
        <div className="mt-3 relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in report tables by student name, Unique ID, grade, or staff email..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-3 py-2 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>
      </div>

      {/* ─── Executive Summary KPI Cards ─── */}
      <ReportStatGrid>
        <ReportStatCard
          label="Total Students"
          value={s?.totalStudentsFiltered ?? 0}
          hint={
            academicYear || grade
              ? `Filtered scope (${s?.totalStudentsAllYears ?? 0} all-time)`
              : `${s?.totalStudentsCurrentEC ?? 0} registered in ${ecYear} EC`
          }
          valueClassName="text-gray-900"
          animate
        />
        <ReportStatCard
          label="Attendance Rate"
          value={`${s?.attendanceStats?.presentRate ?? 0}%`}
          hint={`${s?.attendanceStats?.presentCount ?? 0} present of ${s?.attendanceStats?.totalRecords ?? 0} entries`}
          valueClassName="text-emerald-600"
        />
        <ReportStatCard
          label="Payment Rate"
          value={`${s?.paymentStats?.collectionRate ?? 0}%`}
          hint={`${s?.paymentStats?.paidCount ?? 0} fully paid / ${s?.paymentStats?.unpaidCount ?? 0} unpaid`}
          valueClassName="text-blue-600"
        />
        <ReportStatCard
          label="Average Score"
          value={s?.resultsStats?.averageScore ? `${s.resultsStats.averageScore}` : "0"}
          hint={`Pass Rate: ${s?.resultsStats?.passingRate ?? 0}% across ${s?.resultsStats?.totalResults ?? 0} exams`}
          valueClassName="text-indigo-600"
        />
      </ReportStatGrid>

      {/* ─── Tab Navigation Bar ─── */}
      <div className="print:hidden flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Overview & Demographics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "attendance"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Attendance & Frequent Absences
          {data?.attendanceAnalytics?.totalFrequentAbsentCount ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700 font-extrabold">
              {data.attendanceAnalytics.totalFrequentAbsentCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "payments"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Payment Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "results"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Award className="h-4 w-4" />
          Academic Results
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "staff"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Facilitator & Staff Activity
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & DEMOGRAPHICS                                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "overview" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Students by Grade Distribution */}
            <ReportSection title="Student Enrollment by Grade" className="lg:col-span-2">
              <p className="mb-4 text-xs text-gray-500">
                Distribution of enrolled students across active grades, highlighting gender composition.
              </p>
              {data?.demographics?.studentsByGrade?.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No student records found matching active filter.</p>
              ) : (
                <div className="space-y-3">
                  {data?.demographics?.studentsByGrade?.map((g) => (
                    <div key={g.grade} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-right font-medium text-gray-700 truncate" title={g.grade}>
                        {g.grade}
                      </span>
                      <div className="flex-1">
                        <div className="h-5 overflow-hidden rounded-full bg-gray-100 flex">
                          <div
                            className="h-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${(g.maleCount / maxGradeStudentCount) * 100}%` }}
                            title={`Male: ${g.maleCount}`}
                          />
                          <div
                            className="h-full bg-pink-500 transition-all duration-700"
                            style={{ width: `${(g.femaleCount / maxGradeStudentCount) * 100}%` }}
                            title={`Female: ${g.femaleCount}`}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-right font-bold text-gray-900 tabular-nums">
                        {g.count} <span className="text-[10px] text-gray-400 font-normal">({g.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex items-center justify-end gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Male
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> Female
                    </span>
                  </div>
                </div>
              )}
            </ReportSection>

            {/* Gender & Classification Breakdown */}
            <div className="space-y-6">
              <ReportSection title="Gender Demographics">
                <div className="flex items-center justify-center gap-6 py-2">
                  <DonutChart
                    value={data?.demographics?.gender?.male ?? 0}
                    max={s?.totalStudentsFiltered ?? 1}
                    size={110}
                    strokeWidth={10}
                    color="#3b82f6"
                    bgColor="#ec4899"
                    label="Male %"
                  />
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-md bg-blue-500" />
                      <span className="font-medium text-gray-700">Male:</span>
                      <span className="font-bold text-gray-900">{data?.demographics?.gender?.male ?? 0}</span>
                      <span className="text-gray-400">({data?.demographics?.gender?.malePercentage ?? 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-md bg-pink-500" />
                      <span className="font-medium text-gray-700">Female:</span>
                      <span className="font-bold text-gray-900">{data?.demographics?.gender?.female ?? 0}</span>
                      <span className="text-gray-400">({data?.demographics?.gender?.femalePercentage ?? 0}%)</span>
                    </div>
                  </div>
                </div>
              </ReportSection>

              <ReportSection title="Enrollment Classifications">
                <div className="space-y-2.5">
                  {data?.demographics?.studentsByClassification?.map((cls) => (
                    <div key={cls.classification} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{cls.classification}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{cls.count}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-medium">
                          {cls.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ReportSection>
            </div>
          </div>

          {/* Multi-Year Enrollment Growth */}
          <ReportSection title="Academic Year Historical Trend">
            <p className="mb-4 text-xs text-gray-500">
              Student cohort counts tracked by registered Ethiopian academic year.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {data?.demographics?.studentsByYear?.map((yr) => (
                <div
                  key={yr.academicYear}
                  className={`rounded-2xl border p-4 text-center transition ${
                    yr.academicYear === String(ecYear)
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500">{yr.academicYear} EC</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{yr.count}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{yr.percentage}% of records</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Detailed Student Roster Table */}
          <ReportSection title={`Student Registry Directory (${filteredRawStudents.length} entries)`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Detailed listing of enrolled students matching current filters.
              </p>
              <div className="flex gap-2">
                <ExportButton
                  label="Excel"
                  color="emerald"
                  onClick={() =>
                    exportToExcel(
                      filteredRawStudents.map((s) => ({
                        "Unique ID": s.uniqueId,
                        "Full Name": s.name,
                        Grade: s.grade,
                        "Academic Year": s.academicYear ? `${s.academicYear} EC` : "—",
                        Classification: s.classification,
                        Sex: s.sex,
                        Age: s.age ?? "—",
                        "Phone Number": s.phoneNumber,
                      })),
                      `Students_Roster_${academicYear || "All"}`,
                      {
                        title: "Students Roster Report",
                        sheetName: "Students Roster",
                        filters: activeFilterObj,
                      }
                    )
                  }
                  disabled={filteredRawStudents.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredRawStudents.map((s) => ({
                        "Unique ID": s.uniqueId,
                        Name: s.name,
                        Grade: s.grade,
                        Year: s.academicYear ? `${s.academicYear} EC` : "—",
                        Class: s.classification,
                        Sex: s.sex,
                        Phone: s.phoneNumber,
                      })),
                      title: "Students Roster Report",
                      filename: `Students_Roster_${academicYear || "All"}`,
                      subtitle: `Official Student Registry (${filteredRawStudents.length} Students)`,
                      filters: activeFilterObj,
                    })
                  }
                  disabled={filteredRawStudents.length === 0}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-3 py-2.5">Unique ID</th>
                    <th className="px-3 py-2.5">Full Name</th>
                    <th className="px-3 py-2.5">Grade</th>
                    <th className="px-3 py-2.5">Academic Year</th>
                    <th className="px-3 py-2.5">Classification</th>
                    <th className="px-3 py-2.5">Sex</th>
                    <th className="px-3 py-2.5">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredRawStudents.slice(0, 100).map((st) => (
                    <tr key={st._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{st.uniqueId}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{st.name}</td>
                      <td className="px-3 py-2 text-gray-600">{st.grade}</td>
                      <td className="px-3 py-2 text-gray-600">{st.academicYear}</td>
                      <td className="px-3 py-2 text-gray-600">{st.classification}</td>
                      <td className="px-3 py-2 text-gray-600">{st.sex}</td>
                      <td className="px-3 py-2 text-gray-600">{st.phoneNumber}</td>
                    </tr>
                  ))}
                  {filteredRawStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                        No students found matching current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredRawStudents.length > 100 && (
              <p className="mt-2 text-right text-[11px] text-gray-400">
                Displaying first 100 of {filteredRawStudents.length} students. Use Excel export for the complete dataset.
              </p>
            )}
          </ReportSection>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ATTENDANCE & FREQUENT ABSENCES                                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "attendance" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Donut & Attendance Breakdown */}
            <ReportSection title="Attendance Volume & Rate">
              <div className="flex flex-col items-center justify-center gap-4 py-3">
                <DonutChart
                  value={s?.attendanceStats?.presentCount ?? 0}
                  max={s?.attendanceStats?.totalRecords ?? 1}
                  size={140}
                  strokeWidth={12}
                  color="#10b981"
                  label="Present Rate"
                />
                <div className="grid w-full grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">Present Marks</p>
                    <p className="text-xl font-black text-emerald-800">{s?.attendanceStats?.presentCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-red-600">Absent Marks</p>
                    <p className="text-xl font-black text-red-800">{s?.attendanceStats?.absentCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </ReportSection>

            {/* Attendance Rate by Grade */}
            <ReportSection title="Attendance Rate by Grade" className="lg:col-span-2">
              <p className="mb-4 text-xs text-gray-500">
                Identifies which grades maintain high attendance versus those requiring intervention.
              </p>
              <div className="space-y-3">
                {data?.attendanceAnalytics?.byGrade
                  ?.filter((g) => g.total > 0)
                  ?.map((g) => (
                    <div key={g.grade} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-right font-medium text-gray-700 truncate" title={g.grade}>
                        {g.grade}
                      </span>
                      <div className="flex-1">
                        <ProgressBar
                          value={g.present}
                          max={g.total}
                          color={g.rate >= 80 ? "emerald" : g.rate >= 60 ? "amber" : "red"}
                          showLabel={false}
                        />
                      </div>
                      <div className="w-24 text-right font-bold text-gray-900 tabular-nums">
                        {g.rate}% <span className="text-[10px] text-gray-400 font-normal">({g.present}/{g.total})</span>
                      </div>
                    </div>
                  ))}
                {data?.attendanceAnalytics?.byGrade?.filter((g) => g.total > 0).length === 0 && (
                  <p className="text-xs text-gray-400 py-6 text-center">No attendance marks found in selected scope.</p>
                )}
              </div>
            </ReportSection>
          </div>

          {/* Frequent Absences Table (At-Risk Students) */}
          <ReportSection
            title={`At-Risk Attendance: Frequent Absences (${filteredFrequentAbsences.length} students)`}
            className="border-red-100"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600">
                  Students with recorded absences. Those with <strong>3 or more absences</strong> are flagged in red as high risk.
                </p>
              </div>
              <div className="flex gap-2">
                <ExportButton
                  label="Excel"
                  color="emerald"
                  onClick={() =>
                    exportToExcel(
                      filteredFrequentAbsences.map((s) => ({
                        "Unique ID": s.uniqueId,
                        "Student Name": s.name,
                        Grade: s.grade,
                        "Academic Year": s.academicYear ? `${s.academicYear} EC` : "—",
                        "Absent Count": s.absentCount,
                        "Present Count": s.presentCount,
                        "Total Recorded": s.totalRecorded,
                        "Absent Rate": `${s.absentRate}%`,
                        "High Risk (3+)": s.isHighRisk ? "YES" : "NO",
                        "Last Recorded Date": s.lastRecordedDate,
                      })),
                      "Frequent_Absences_Report",
                      {
                        title: "At-Risk Attendance & Frequent Absences Report",
                        sheetName: "Frequent Absences",
                        filters: activeFilterObj,
                      }
                    )
                  }
                  disabled={filteredFrequentAbsences.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredFrequentAbsences.map((s) => ({
                        "Unique ID": s.uniqueId,
                        Name: s.name,
                        Grade: s.grade,
                        Absences: s.absentCount,
                        Presents: s.presentCount,
                        "Risk Flag": s.isHighRisk ? "3+ ABSENT" : "Normal",
                        Date: s.lastRecordedDate,
                      })),
                      title: "At-Risk Students - Frequent Absences Report",
                      filename: "Frequent_Absences_Report",
                      subtitle: `Students requiring attendance follow-up (${filteredFrequentAbsences.length} flagged students)`,
                      filters: activeFilterObj,
                    })
                  }
                  disabled={filteredFrequentAbsences.length === 0}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Unique ID</th>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Grade</th>
                    <th className="px-3 py-2.5">Absences</th>
                    <th className="px-3 py-2.5">Present</th>
                    <th className="px-3 py-2.5">Absence Rate</th>
                    <th className="px-3 py-2.5">Last Recorded Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredFrequentAbsences.map((s) => (
                    <tr
                      key={s.studentId}
                      className={`transition ${s.isHighRisk ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-3 py-2">
                        {s.isHighRisk ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            <AlertTriangle className="h-3 w-3" /> High Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            Notice
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-gray-800">{s.uniqueId}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{s.name}</td>
                      <td className="px-3 py-2 text-gray-600">{s.grade}</td>
                      <td className="px-3 py-2 font-bold text-red-600 tabular-nums">{s.absentCount}</td>
                      <td className="px-3 py-2 text-emerald-600 tabular-nums">{s.presentCount}</td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums">{s.absentRate}%</td>
                      <td className="px-3 py-2 text-gray-500">{s.lastRecordedDate}</td>
                    </tr>
                  ))}
                  {filteredFrequentAbsences.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                        No students with recorded absences found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PAYMENT STATUS                                                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "payments" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Paid vs Unpaid Donut & Stats */}
            <ReportSection title="Payment Overview">
              <div className="flex flex-col items-center justify-center gap-4 py-3">
                <DonutChart
                  value={s?.paymentStats?.paidCount ?? 0}
                  max={s?.paymentStats?.totalEvaluated ?? 1}
                  size={140}
                  strokeWidth={12}
                  color="#2563eb"
                  label="Paid Rate"
                />
                <div className="grid w-full grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5">
                    <p className="text-[10px] font-bold text-emerald-600">Paid</p>
                    <p className="text-lg font-black text-emerald-800">{s?.paymentStats?.paidCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
                    <p className="text-[10px] font-bold text-amber-600">Partial</p>
                    <p className="text-lg font-black text-amber-800">{s?.paymentStats?.partialCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50 p-2.5">
                    <p className="text-[10px] font-bold text-red-600">Unpaid</p>
                    <p className="text-lg font-black text-red-800">{s?.paymentStats?.unpaidCount ?? 0}</p>
                  </div>
                </div>
              </div>
            </ReportSection>

            {/* Payment Collection by Grade */}
            <ReportSection title="Payment Collection by Grade" className="lg:col-span-2">
              <p className="mb-4 text-xs text-gray-500">
                Payment compliance rate broken down per grade for {academicYear ? `${academicYear} EC` : "the current academic year"}.
              </p>
              <div className="space-y-3">
                {data?.paymentAnalytics?.byGrade
                  ?.filter((g) => g.total > 0)
                  ?.map((g) => (
                    <div key={g.grade} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-right font-medium text-gray-700 truncate" title={g.grade}>
                        {g.grade}
                      </span>
                      <div className="flex-1">
                        <ProgressBar
                          value={g.paid}
                          max={g.total}
                          color={g.rate >= 80 ? "emerald" : g.rate >= 50 ? "blue" : "amber"}
                          showLabel={false}
                        />
                      </div>
                      <div className="w-24 text-right font-bold text-gray-900 tabular-nums">
                        {g.rate}% <span className="text-[10px] text-gray-400 font-normal">({g.paid}/{g.total})</span>
                      </div>
                    </div>
                  ))}
                {data?.paymentAnalytics?.byGrade?.filter((g) => g.total > 0).length === 0 && (
                  <p className="text-xs text-gray-400 py-6 text-center">No payment records found.</p>
                )}
              </div>
            </ReportSection>
          </div>

          {/* Student Payment Compliance Table */}
          <ReportSection title={`Student Payment Records Directory (${filteredStudentPayments.length} entries)`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Status by student for Ethiopian academic months (Pagumē excluded per system rules).
              </p>
              <div className="flex gap-2">
                <ExportButton
                  label="Excel"
                  color="blue"
                  onClick={() =>
                    exportToExcel(
                      filteredStudentPayments.map((p) => ({
                        "Unique ID": p.uniqueId,
                        "Student Name": p.name,
                        Grade: p.grade,
                        "Academic Year": p.academicYear ? `${p.academicYear} EC` : "—",
                        "Overall Status": p.overallStatus,
                        "Months Paid": p.paidMonthsCount,
                        "Compliance Summary": p.monthsSummary,
                      })),
                      `Payment_Compliance_Report_${academicYear || "All"}`,
                      {
                        title: "Student Payment Compliance Report",
                        sheetName: "Payment Compliance",
                        filters: activeFilterObj,
                      }
                    )
                  }
                  disabled={filteredStudentPayments.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredStudentPayments.map((p) => ({
                        "Unique ID": p.uniqueId,
                        Name: p.name,
                        Grade: p.grade,
                        Status: p.overallStatus,
                        Summary: p.monthsSummary,
                      })),
                      title: "Student Payment Compliance Report",
                      filename: `Payment_Compliance_Report_${academicYear || "All"}`,
                      subtitle: `Monthly fee status records (${filteredStudentPayments.length} students)`,
                      filters: activeFilterObj,
                    })
                  }
                  disabled={filteredStudentPayments.length === 0}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Unique ID</th>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Grade</th>
                    <th className="px-3 py-2.5">Academic Year</th>
                    <th className="px-3 py-2.5">Months Paid</th>
                    <th className="px-3 py-2.5">Compliance Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredStudentPayments.slice(0, 100).map((st) => (
                    <tr key={st.studentId} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2">
                        {st.overallStatus === "Paid" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Fully Paid
                          </span>
                        ) : st.overallStatus === "Partial" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Percent className="h-3 w-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                            <XCircle className="h-3 w-3" /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-gray-800">{st.uniqueId}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{st.name}</td>
                      <td className="px-3 py-2 text-gray-600">{st.grade}</td>
                      <td className="px-3 py-2 text-gray-600">{st.academicYear}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 tabular-nums">{st.paidMonthsCount} mo</td>
                      <td className="px-3 py-2 text-gray-500">{st.monthsSummary}</td>
                    </tr>
                  ))}
                  {filteredStudentPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredStudentPayments.length > 100 && (
              <p className="mt-2 text-right text-[11px] text-gray-400">
                Displaying first 100 of {filteredStudentPayments.length} records. Use Excel export for the full log.
              </p>
            )}
          </ReportSection>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ACADEMIC RESULTS                                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "results" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Score & Passing Distribution */}
            <ReportSection title="Performance Overview">
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Overall Mean Score</p>
                  <p className="text-3xl font-black text-indigo-950 mt-1">{s?.resultsStats?.averageScore ?? 0} / 100</p>
                  <p className="text-xs text-indigo-600 mt-1">Pass rate: {s?.resultsStats?.passingRate ?? 0}%</p>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-700 mb-2">Grade Letter Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {data?.performanceAnalytics?.gradeDistribution?.map((item) => (
                      <span
                        key={item.letter}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          item.letter.startsWith("A")
                            ? "bg-emerald-100 text-emerald-800"
                            : item.letter.startsWith("B")
                            ? "bg-blue-100 text-blue-800"
                            : item.letter.startsWith("C")
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.letter}: {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ReportSection>

            {/* Results by Grade */}
            <ReportSection title="Academic Average by Grade" className="lg:col-span-2">
              <p className="mb-4 text-xs text-gray-500">
                Mean test & exam scores (out of 100) calculated per class.
              </p>
              <div className="space-y-3">
                {data?.performanceAnalytics?.byGrade
                  ?.filter((g) => g.resultsCount > 0)
                  ?.map((g) => (
                    <div key={g.grade} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-right font-medium text-gray-700 truncate" title={g.grade}>
                        {g.grade}
                      </span>
                      <div className="flex-1">
                        <ProgressBar
                          value={g.avgScore}
                          max={100}
                          color={g.avgScore >= 80 ? "emerald" : g.avgScore >= 60 ? "indigo" : "amber"}
                          showLabel={false}
                        />
                      </div>
                      <div className="w-24 text-right font-bold text-gray-900 tabular-nums">
                        {g.avgScore} pts <span className="text-[10px] text-gray-400 font-normal">({g.resultsCount} res)</span>
                      </div>
                    </div>
                  ))}
                {data?.performanceAnalytics?.byGrade?.filter((g) => g.resultsCount > 0).length === 0 && (
                  <p className="text-xs text-gray-400 py-6 text-center">No academic results recorded yet in this scope.</p>
                )}
              </div>
            </ReportSection>
          </div>

          {/* Top Achievers and Students Needing Support */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Performers */}
            <ReportSection title="Top Academic Achievers" className="border-emerald-100">
              <div className="space-y-2.5">
                {data?.performanceAnalytics?.topPerformers?.slice(0, 6).map((tp, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-emerald-50/40 p-3 text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{tp.studentName}</p>
                      <p className="text-[11px] text-gray-500">{tp.grade} • {tp.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                        {tp.totalScore} ({tp.letterGrade})
                      </span>
                    </div>
                  </div>
                ))}
                {(!data?.performanceAnalytics?.topPerformers || data.performanceAnalytics.topPerformers.length === 0) && (
                  <p className="text-xs text-gray-400 py-4 text-center">No high score results found.</p>
                )}
              </div>
            </ReportSection>

            {/* Students Needing Academic Support */}
            <ReportSection title="Students Needing Academic Attention" className="border-red-100">
              <div className="space-y-2.5">
                {data?.performanceAnalytics?.needsSupport?.slice(0, 6).map((ns, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-red-50/40 p-3 text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{ns.studentName}</p>
                      <p className="text-[11px] text-gray-500">{ns.grade} • {ns.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-800">
                        {ns.totalScore} ({ns.letterGrade})
                      </span>
                    </div>
                  </div>
                ))}
                {(!data?.performanceAnalytics?.needsSupport || data.performanceAnalytics.needsSupport.length === 0) && (
                  <p className="text-xs text-gray-400 py-4 text-center">No students currently flagged under passing score.</p>
                )}
              </div>
            </ReportSection>
          </div>

          {/* Export Results */}
          <ReportSection title="Export Academic Records">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-600">
                  Export complete student result logs including assignments, tests, and final examinations.
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Total result entries in scope: {data?.performanceAnalytics?.rawResults?.length ?? 0}
                </p>
              </div>
              <div className="flex gap-2">
                <ExportButton
                  label="Results Excel"
                  color="violet"
                  onClick={() =>
                    exportToExcel(
                      (data?.performanceAnalytics?.rawResults ?? []).map((r) => ({
                        "Student Name": r.studentName,
                        Subject: r.subjectName,
                        "Academic Year": r.academicYear ? `${r.academicYear} EC` : "—",
                        "Total Score": r.totalScore,
                        "Letter Grade": r.letterGrade,
                        "Evaluation Date": r.recordedDate,
                      })),
                      `Academic_Results_${academicYear || "All"}`,
                      {
                        title: "Student Academic Results Summary",
                        sheetName: "Academic Results",
                        filters: activeFilterObj,
                      }
                    )
                  }
                  disabled={!data || data.performanceAnalytics.rawResults.length === 0}
                />
                <ExportButton
                  label="Results PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: data?.performanceAnalytics?.rawResults?.map((r) => ({
                        Student: r.studentName,
                        Subject: r.subjectName,
                        Year: r.academicYear ? `${r.academicYear} EC` : "—",
                        Score: r.totalScore,
                        Grade: r.letterGrade,
                        Date: r.recordedDate,
                      })) ?? [],
                      title: "Academic Results Summary",
                      filename: `Academic_Results_Summary_${academicYear || "All"}`,
                      subtitle: `Student examination records (${data?.performanceAnalytics?.rawResults?.length ?? 0} records)`,
                      filters: activeFilterObj,
                    })
                  }
                  disabled={!data || data.performanceAnalytics.rawResults.length === 0}
                />
              </div>
            </div>
          </ReportSection>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: FACILITATOR & STAFF ACTIVITY                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "staff" || typeof window === "undefined") && (
        <div className="space-y-6">
          {/* Staff Roles KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <p className="text-xs font-bold uppercase text-blue-600">Education Facilitators</p>
              <p className="mt-1 text-2xl font-black text-blue-900">{s?.staffStats?.educationFacilitators ?? 0}</p>
              <p className="text-[11px] text-blue-700/80 mt-1">Manage curriculum and results entry</p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5">
              <p className="text-xs font-bold uppercase text-purple-600">Attendance Facilitators</p>
              <p className="mt-1 text-2xl font-black text-purple-900">{s?.staffStats?.attendanceFacilitators ?? 0}</p>
              <p className="text-[11px] text-purple-700/80 mt-1">Mark Sunday & session attendance</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <p className="text-xs font-bold uppercase text-gray-600">Administrative Accounts</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{s?.staffStats?.admins ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1">Super Admin & Department Admins</p>
            </div>
          </div>

          {/* Grade Coverage Matrix */}
          <ReportSection title="Class & Grade Facilitator Coverage">
            <p className="mb-4 text-xs text-gray-500">
              Coverage matrix displaying assigned facilitators per grade level to ensure no classes are unattended.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.facilitatorActivity?.coverage?.map((cov) => (
                <div
                  key={cov.grade}
                  className={`rounded-xl border p-3.5 transition ${
                    cov.hasFacilitator ? "border-emerald-100 bg-emerald-50/30" : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">{cov.grade}</span>
                    {cov.hasFacilitator ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {cov.facilitatorCount} assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Uncovered
                      </span>
                    )}
                  </div>
                  {cov.facilitators.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {cov.facilitators.map((f, i) => (
                        <p key={i} className="text-[11px] text-gray-600 truncate">
                          • {f.name} <span className="text-gray-400">({f.role.replace("Facilitator", "")})</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-amber-700 italic">No facilitators assigned to this grade.</p>
                  )}
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Facilitator Activity Registry Table */}
          <ReportSection title={`Staff Activity Registry (${filteredStaffList.length} accounts)`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Staff directory detailing account roles, assigned grades, and total attendance records submitted.
              </p>
              <div className="flex gap-2">
                <ExportButton
                  label="Excel"
                  color="blue"
                  onClick={() =>
                    exportToExcel(
                      filteredStaffList.map((st) => ({
                        "Full Name": st.name,
                        "Email Address": st.email,
                        Role: st.role,
                        "Assigned Grades": st.assignedGrades.join(", ") || "—",
                        "Attendance Marks Submitted": st.attendanceMarksCount,
                      })),
                      "Staff_Facilitator_Activity",
                      {
                        title: "Staff and Facilitators Activity Report",
                        sheetName: "Staff Activity",
                        filters: activeFilterObj,
                      }
                    )
                  }
                  disabled={filteredStaffList.length === 0}
                />
                <ExportButton
                  label="PDF"
                  color="gray"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    exportToPDF({
                      data: filteredStaffList.map((st) => ({
                        Name: st.name,
                        Email: st.email,
                        Role: st.role,
                        Grades: st.assignedGrades.join(", ") || "—",
                        Marks: st.attendanceMarksCount,
                      })),
                      title: "Facilitators and Staff Activity Report",
                      filename: "Facilitators_Staff_Activity",
                      subtitle: `Staff engagement and assigned duties (${filteredStaffList.length} accounts)`,
                      filters: activeFilterObj,
                    })
                  }
                  disabled={filteredStaffList.length === 0}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Assigned Grades</th>
                    <th className="px-3 py-2.5 text-right">Attendance Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredStaffList.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2 font-semibold text-gray-900">{u.name}</td>
                      <td className="px-3 py-2 text-gray-600">{u.email}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {u.assignedGrades.length > 0 ? u.assignedGrades.join(", ") : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-right text-gray-900 tabular-nums">
                        {u.attendanceMarksCount}
                      </td>
                    </tr>
                  ))}
                  {filteredStaffList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                        No facilitator accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </div>
      )}
    </ReportPageLayout>
  );
}
