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

export default function HRReportsDashboard() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ academicYear?: string }>({});

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
