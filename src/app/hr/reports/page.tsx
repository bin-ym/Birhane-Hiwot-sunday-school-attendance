"use client";

import { useEffect, useState, useMemo } from "react";
import { Student, User } from "@/lib/models";
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
  Skeleton,
  ReportFilters,
} from "@/components/reports/ReportPageLayout";
import { Users, GraduationCap, FileText } from "lucide-react";

import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";
import { ETHIOPIAN_MONTHS, gregorianToEthiopian } from "@/lib/utils";

interface MonthlyStudentReportRow {
  studentId: string;
  uniqueId: string;
  name: string;
  grade: string;
  classification: string;
  presentDays: number;
  absentDays: number;
  paymentStatus: string;
  paymentAmount: string | number;
}

interface MonthlyReportData {
  academicYear: string;
  month: string;
  totals: {
    students: number;
    presentDays: number;
    absentDays: number;
    absentThreeOrMore: number;
    unpaidStudents: number;
  };
  students: MonthlyStudentReportRow[];
}

export default function HRReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ academicYear?: string }>({});
  const currentEthiopianDate = gregorianToEthiopian(new Date());
  const [reportYear, setReportYear] = useState(String(ecYear));
  const [reportMonth, setReportMonth] = useState(currentEthiopianDate.month);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // Students are fetched server-side filtered by academic year.
  const studentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.academicYear) params.append("academicYear", filters.academicYear);
    const qs = params.toString();
    return `/api/students${qs ? `?${qs}` : ""}`;
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      safeFetch<any[]>(studentsUrl, []),
      safeFetch<any[]>('/api/facilitators', []),
    ]).then(([s, f]) => {
      setStudents(Array.isArray(s) ? s : []);
      setFacilitators(Array.isArray(f) ? f : []);
    }).finally(() => setLoading(false));
  }, [studentsUrl]);

  const monthlyReportUrl = `/api/hr/reports/monthly-attendance?academicYear=${reportYear}&month=${reportMonth}`;

  useEffect(() => {
    let active = true;
    setMonthlyLoading(true);
    setMonthlyError(null);
    fetch(monthlyReportUrl)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Failed to load monthly report");
        }
        return response.json() as Promise<MonthlyReportData>;
      })
      .then((data) => {
        if (active) setMonthlyReport(data);
      })
      .catch((error) => {
        if (active) {
          setMonthlyReport(null);
          setMonthlyError(error instanceof Error ? error.message : "Failed to load monthly report");
        }
      })
      .finally(() => {
        if (active) setMonthlyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [monthlyReportUrl]);

  const reportYears = Array.from(
    new Set([
      String(ecYear),
      ...students
        .map((student) => String(student.Academic_Year).match(/\d{4}/)?.[0])
        .filter((year): year is string => Boolean(year)),
    ]),
  ).sort((left, right) => right.localeCompare(left));

  // Students are already server-filtered; keep the memo as a cheap safety net.
  const filteredStudents = useMemo(() => students, [students]);

  const currentYearStudents = useMemo(
    () => filteredStudents.filter((st) =>
      academicYearMatchesEthiopian(String(st.Academic_Year), ecYear)),
    [filteredStudents, ecYear],
  );

  const totalEducationFacilitators = facilitators.filter(
    (f) => f.role === "Education Facilitator",
  ).length;
  const totalAttendanceFacilitators = facilitators.filter(
    (f) => f.role === "Attendance Facilitator",
  ).length;

  if (loading) {
    return (
      <ReportPageLayout
        badge="HR"
        title="Staffing & registry intelligence"
        subtitle="Loading data..."
        heroGradient="from-blue-950 via-indigo-900 to-slate-900"
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
      badge="HR"
      title="Staffing & registry intelligence"
      subtitle="Cross-check facilitator accounts against the student body. Filter by academic year to narrow student data."
      heroGradient="from-blue-950 via-indigo-900 to-slate-900"
    >
      <ReportFilters
        grades={[]}
        onFilter={setFilters}
        showAcademicYear
        showGrade={false}
        showDateRange={false}
      />

      <ReportStatGrid>
        <ReportStatCard
          label="All students (API)"
          value={filteredStudents.length}
          hint="Filtered by academic year."
          valueClassName="text-blue-700"
          animate
        />
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={currentYearStudents.length}
          hint="Current Ethiopian academic year."
          valueClassName="text-emerald-700"
          animate
        />
        <ReportStatCard
          label="Education facilitators"
          value={totalEducationFacilitators}
          valueClassName="text-indigo-700"
          animate
        />
        <ReportStatCard
          label="Attendance facilitators"
          value={totalAttendanceFacilitators}
          valueClassName="text-violet-700"
          animate
        />
      </ReportStatGrid>

      <ReportSection title="Monthly attendance & payment">
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Ethiopian year
            <select
              value={reportYear}
              onChange={(event) => setReportYear(event.target.value)}
              className="min-w-32 rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              {reportYears.map((year) => (
                <option key={year} value={year}>{year} EC</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700">
            Month
            <select
              value={reportMonth}
              onChange={(event) => setReportMonth(Number(event.target.value))}
              className="min-w-40 rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              {ETHIOPIAN_MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </label>
          <ExportButton
            label="Export monthly report"
            color="emerald"
            onClick={() =>
              exportToExcel(
                (monthlyReport?.students || []) as unknown[],
                `HR_${reportYear}_${ETHIOPIAN_MONTHS[reportMonth - 1]}_Attendance_Payments`,
              )
            }
            disabled={monthlyLoading || !monthlyReport?.students.length}
          />
        </div>

        {monthlyError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {monthlyError}
          </p>
        ) : monthlyLoading ? (
          <Skeleton className="h-40" />
        ) : monthlyReport ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Students</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{monthlyReport.totals.students}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">Absent 3+ days</p>
                <p className="mt-1 text-xl font-bold text-red-800">{monthlyReport.totals.absentThreeOrMore}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Present marks</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">{monthlyReport.totals.presentDays}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Unpaid students</p>
                <p className="mt-1 text-xl font-bold text-amber-800">{monthlyReport.totals.unpaidStudents}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Grade</th>
                    <th className="px-3 py-3">Present</th>
                    <th className="px-3 py-3">Absent</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyReport.students.map((student) => (
                    <tr
                      key={student.studentId}
                      className={student.absentDays >= 3 ? "bg-red-50/70" : "bg-white"}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.uniqueId}</div>
                      </td>
                      <td className="px-3 py-3">{student.grade}</td>
                      <td className="px-3 py-3">{student.presentDays}</td>
                      <td className="px-3 py-3">
                        <span className={student.absentDays >= 3 ? "font-bold text-red-700" : "text-gray-700"}>
                          {student.absentDays}
                          {student.absentDays >= 3 && <span className="ml-2 text-xs">3+ absences</span>}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={student.paymentStatus === "Paid" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                          {student.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">{student.paymentAmount || "—"}</td>
                    </tr>
                  ))}
                  {monthlyReport.students.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No students found for {reportYear} EC.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Absences count recorded attendance entries marked absent in {monthlyReport.month}; unmarked dates are not counted.
            </p>
          </>
        ) : null}
      </ReportSection>

      <ReportSection title="Exports & tools">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-gray-900">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  Staff registry
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Master list of facilitator accounts you are allowed to see.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {facilitators.length}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <ExportButton
                label="Staff Excel"
                color="blue"
                onClick={() => exportToExcel(facilitators as unknown[], "All_Staff_Registry")}
                disabled={facilitators.length === 0}
              />
              <ExportButton
                label="PDF"
                color="gray"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  exportToPDF({
                    data: facilitators as any[],
                    title: "HR - Staff Registry",
                    filename: "HR_Staff_Registry_PDF",
                    subtitle: `Total: ${facilitators.length} facilitator accounts`,
                  })
                }
                disabled={facilitators.length === 0}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-gray-900">
                  <Users className="h-5 w-5 text-emerald-500" />
                  Global students
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {filteredStudents.length} records across years.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {filteredStudents.length}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <ExportButton
                label="Students Excel"
                color="emerald"
                onClick={() => exportToExcel(filteredStudents as unknown[], "Global_Students_Registry")}
                disabled={filteredStudents.length === 0}
              />
              <ExportButton
                label="PDF"
                color="gray"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  exportToPDF({
                    data: filteredStudents as any[],
                    title: "HR - Global Student Registry",
                    filename: "HR_Global_Students_PDF",
                    subtitle: `Total: ${filteredStudents.length} students`,
                  })
                }
                disabled={filteredStudents.length === 0}
              />
            </div>
          </div>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
