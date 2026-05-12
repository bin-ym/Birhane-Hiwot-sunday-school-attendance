"use client";

import { useEffect, useState, useMemo } from "react";
import { Student } from "@/lib/models";
import {
  academicYearMatchesEthiopian,
  getCurrentEthiopianYear,
} from "@/lib/utils";
import {
  ReportPageLayout,
  ReportSection,
  ReportStatCard,
  ReportStatGrid,
} from "@/components/reports/ReportPageLayout";

function exportToCSV(data: unknown[], filename: string) {
  if (data.length === 0) return;
  const csv = [
    Object.keys(data[0] as object).join(","),
    ...data.map((row) =>
      Object.values(row as Record<string, unknown>)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/student-results").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
    ])
      .then(([s, res, sub]) => {
        setStudents(Array.isArray(s) ? s : []);
        setResults(Array.isArray(res) ? res : []);
        setSubjects(Array.isArray(sub) ? sub : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentYearStudents = useMemo(
    () =>
      students.filter((st) =>
        academicYearMatchesEthiopian(String(st.Academic_Year), ecYear),
      ),
    [students, ecYear],
  );

  const currentYearResults = useMemo(
    () =>
      results.filter((r) =>
        academicYearMatchesEthiopian(String(r.academicYear ?? ""), ecYear),
      ),
    [results, ecYear],
  );

  const subjectsThisYear = useMemo(
    () =>
      subjects.filter((sub) =>
        academicYearMatchesEthiopian(String(sub.academicYear ?? ""), ecYear),
      ),
    [subjects, ecYear],
  );

  return (
    <ReportPageLayout
      badge="Education facilitator"
      title="Results & curriculum snapshot"
      subtitle={`Figures below emphasise the current Ethiopian academic year (${ecYear} EC): students on file, recorded result rows, and subjects defined for any grade.`}
      heroGradient="from-violet-950 via-purple-900 to-indigo-950"
    >
      <ReportStatGrid>
        <ReportStatCard
          label={`Students (${ecYear} EC)`}
          value={loading ? "…" : currentYearStudents.length}
          valueClassName="text-violet-700"
        />
        <ReportStatCard
          label={`Result rows (${ecYear} EC)`}
          value={loading ? "…" : currentYearResults.length}
          hint="Rows in student_results for this year."
          valueClassName="text-indigo-700"
        />
        <ReportStatCard
          label={`Subjects (${ecYear} EC)`}
          value={loading ? "…" : subjectsThisYear.length}
          valueClassName="text-emerald-700"
        />
        <ReportStatCard
          label="All students (API)"
          value={loading ? "…" : students.length}
          hint="Includes every academic year."
          valueClassName="text-gray-800"
        />
      </ReportStatGrid>

      <ReportSection title="Exports">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-violet-500 disabled:opacity-50"
            onClick={() =>
              exportToCSV(
                currentYearResults as unknown[],
                `student_results_${ecYear}_ec.csv`,
              )
            }
            disabled={currentYearResults.length === 0}
          >
            Export current-year results
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            onClick={() =>
              exportToCSV(
                currentYearStudents as unknown[],
                `students_${ecYear}_ec.csv`,
              )
            }
            disabled={currentYearStudents.length === 0}
          >
            Export current-year students
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            onClick={() =>
              exportToCSV(subjectsThisYear as unknown[], `subjects_${ecYear}_ec.csv`)
            }
            disabled={subjectsThisYear.length === 0}
          >
            Export current-year subjects
          </button>
        </div>
      </ReportSection>
    </ReportPageLayout>
  );
}
