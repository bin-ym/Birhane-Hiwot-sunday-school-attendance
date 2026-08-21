"use client";

import { useEffect, useState, useMemo } from "react";
import { Student } from "@/lib/models";
import { GRADE_OPTIONS } from "@/lib/constants";
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
  ProgressBar,
  Skeleton,
  ReportFilters,
} from "@/components/reports/ReportPageLayout";
import { BookOpen, GraduationCap, Library, FileText, Users, BarChart3 } from "lucide-react";

import { exportToExcel } from "@/lib/excelExport";
import { exportToPDF } from "@/lib/pdfExport";
import { safeFetch } from "@/lib/safeFetch";

type ResultRow = {
  _id?: string;
  studentId?: string;
  subjectId?: string;
  academicYear?: string;
};

type SubjectRow = {
  _id?: string;
  name?: string;
  grade?: string;
  academicYear?: string;
};

export default function EducationFacilitatorResultsReportsPage() {
  const ecYear = getCurrentEthiopianYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ academicYear?: string; grade?: string }>({});

  // Students & subjects are fetched server-side filtered by grade/year.
  const studentsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.academicYear) params.append("academicYear", filters.academicYear);
    const qs = params.toString();
    return `/api/students${qs ? `?${qs}` : ""}`;
  }, [filters]);

  const subjectsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.grade) params.append("grade", filters.grade);
    if (filters.academicYear) params.append("academicYear", filters.academicYear);
    const qs = params.toString();
    return `/api/subjects${qs ? `?${qs}` : ""}`;
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      safeFetch<any[]>(studentsUrl, []),
      safeFetch<any[]>('/api/student-results', []),
      safeFetch<any[]>(subjectsUrl, []),
    ])
      .then(([s, res, sub]) => {
        setStudents(Array.isArray(s) ? s : []);
        setResults(Array.isArray(res) ? res : []);
        setSubjects(Array.isArray(sub) ? sub : []);
      })
      .finally(() => setLoading(false));
  }, [studentsUrl, subjectsUrl]);

  // Students are already server-filtered; keep the memo as a cheap safety net.
  const filteredStudents = useMemo(() => students, [students]);

  const currentYearStudents = useMemo(
    () => filteredStudents.filter((st) =>
      academicYearMatchesEthiopian(String(st.Academic_Year), ecYear)),
    [filteredStudents, ecYear],
  );

  const currentYearResults = useMemo(
    () => results.filter((r) => {
      if (filters.academicYear && r.academicYear !== filters.academicYear) return false;
      return academicYearMatchesEthiopian(String(r.academicYear ?? ""), ecYear);
    }),
    [results, ecYear, filters],
  );

  const subjectsThisYear = useMemo(
    () => subjects.filter((sub) => {
      if (filters.grade && sub.grade !== filters.grade) return false;
      return academicYearMatchesEthiopian(String(sub.academicYear ?? ""), ecYear);
    }),
    [subjects, ecYear, filters],
  );

  if (loading) {
    return (
      <ReportPageLayout
        badge="Education facilitator"
        title="Results & curriculum snapshot"
        subtitle="Loading data..."
        heroGradient="from-violet-950 via-purple-900 to-indigo-950"
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
      badge="Education facilitator"
      title="Results & curriculum snapshot"
      subtitle={`Figures below emphasise the current Ethiopian academic year (${ecYear} EC). Use filters to narrow by grade or year.`}
      heroGradient="from-violet-950 via-purple-900 to-indigo-950"
    >
      <ReportFilters
        grades={GRADE_OPTIONS}
        onFilter={setFilters}
        showAcademicYear
        showGrade
        showDateRange={false}
      />

      <ReportStatGrid>
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={currentYearStudents.length}
          valueClassName="text-violet-700"
          animate
        />
        <ReportStatCard
          label={`Result rows (${ecYear} EC)`}
          value={currentYearResults.length}
          hint="Rows in student_results for this year."
          valueClassName="text-indigo-700"
          animate
        />
        <ReportStatCard
          label={`Subjects (${ecYear} EC)`}
          value={subjectsThisYear.length}
          valueClassName="text-emerald-700"
          animate
        />
        <ReportStatCard
          label="All students (API)"
          value={students.length}
          hint="Includes every academic year."
          valueClassName="text-gray-800"
          animate
        />
      </ReportStatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportSection title="Curriculum overview" className="lg:col-span-2">
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Students</p>
                  <p className="text-xs text-gray-500">Current academic year</p>
                </div>
              </div>
              <p className="text-2xl font-black tabular-nums text-violet-700">{currentYearStudents.length}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Results</p>
                  <p className="text-xs text-gray-500">Current academic year</p>
                </div>
              </div>
              <p className="text-2xl font-black tabular-nums text-indigo-700">{currentYearResults.length}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Library className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Subjects</p>
                  <p className="text-xs text-gray-500">Current academic year</p>
                </div>
              </div>
              <p className="text-2xl font-black tabular-nums text-emerald-700">{subjectsThisYear.length}</p>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Data ratios">
          <div className="space-y-5">
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Results per student</p>
              <ProgressBar value={currentYearResults.length} max={currentYearStudents.length * 3 || 1} color="indigo" />
              <p className="mt-1 text-xs text-gray-500">
                {currentYearStudents.length > 0
                  ? `${(currentYearResults.length / currentYearStudents.length).toFixed(1)} avg / student`
                  : "No students"}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Subjects vs students</p>
              <ProgressBar value={subjectsThisYear.length} max={currentYearStudents.length || 1} color="emerald" />
            </div>
          </div>
        </ReportSection>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportSection title="Export results">
          <div className="space-y-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-gray-800">Student Results</span>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{currentYearResults.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <ExportButton
                label="Excel"
                color="violet"
                onClick={() => exportToExcel(currentYearResults as unknown[], `Student_Results_${ecYear}_EC`)}
                disabled={currentYearResults.length === 0}
              />
              <ExportButton
                label="PDF"
                color="gray"
                icon={<FileText className="h-4 w-4" />}
                onClick={() => exportToPDF({ data: currentYearResults as any[], title: `Student Results (${ecYear} EC)`, filename: `Student_Results_${ecYear}_EC_PDF`, subtitle: `Total: ${currentYearResults.length} results` })}
                disabled={currentYearResults.length === 0}
              />
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Export registry">
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-800">Students & Subjects</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{currentYearStudents.length + subjectsThisYear.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <ExportButton
                label="Students"
                color="emerald"
                onClick={() => exportToExcel(currentYearStudents as unknown[], `Students_${ecYear}_EC`)}
                disabled={currentYearStudents.length === 0}
              />
              <ExportButton
                label="Subjects"
                color="gray"
                onClick={() => exportToExcel(subjectsThisYear as unknown[], `Subjects_${ecYear}_EC`)}
                disabled={subjectsThisYear.length === 0}
              />
            </div>
          </div>
        </ReportSection>
      </div>
    </ReportPageLayout>
  );
}
