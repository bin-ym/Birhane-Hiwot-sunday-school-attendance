"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { getTodayEthiopianDateISO } from "@/lib/utils";

interface Student {
  _id: string;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grade: string;
  Academic_Year: string;
}

interface Subject {
  _id: string;
  name: string;
  grade: string;
  academicYear: string;
}

interface Result {
  _id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  assignment1?: number;
  assignment2?: number;
  midTest?: number;
  finalExam?: number;
  totalScore?: number;
  grade?: string;
  remarks?: string;
  recordedDate?: string;
}

export const MAX_ASSIGNMENT = 20;
export const MAX_MID = 30;
export const MAX_FINAL = 50;

function normalizeYearToken(y: string): string {
  const digits = String(y).replace(/\D/g, "");
  const n = parseInt(digits.slice(0, 4), 10);
  return Number.isFinite(n) ? String(n) : String(y).trim();
}

function assignmentTotal(r: Partial<Result>): number {
  return (r.assignment1 ?? 0) + (r.assignment2 ?? 0);
}

function getUniversityGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D";
  return "F";
}

function formatCell(score: number | undefined, _max: number, hasRow: boolean) {
  if (!hasRow) return "NG";
  if (score === undefined || Number.isNaN(score)) return "NG";
  return String(score);
}

export type StudentResultsPanelProps = {
  studentMongoId: string;
  backHref: string;
  backLabel?: string;
};

export function StudentResultsPanel({
  studentMongoId,
  backHref,
  backLabel = "Back",
}: StudentResultsPanelProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [form, setForm] = useState({
    assignment: "",
    mid: "",
    final: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!studentMongoId) return;
    setLoading(true);
    try {
      const studentRes = await fetch(`/api/students/${studentMongoId}`);
      if (!studentRes.ok) throw new Error("Failed to fetch student");
      const studentData: Student = await studentRes.json();
      setStudent(studentData);

      const subjectsRes = await fetch("/api/subjects");
      if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
      const allSubjects: Subject[] = await subjectsRes.json();

      const yStu = normalizeYearToken(studentData.Academic_Year);
      const forGrade = allSubjects.filter(
        (s) =>
          s.grade === studentData.Grade &&
          normalizeYearToken(s.academicYear) === yStu,
      );
      setSubjects(forGrade);

      const resultsRes = await fetch(
        `/api/student-results?studentId=${encodeURIComponent(studentData.Unique_ID)}`,
      );
      if (!resultsRes.ok) throw new Error("Failed to fetch results");
      const resultsData: Result[] = await resultsRes.json();
      setResults(resultsData);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [studentMongoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resultBySubjectId = useMemo(() => {
    const m = new Map<string, Result>();
    if (!student) return m;
    for (const r of results) {
      if (
        normalizeYearToken(r.academicYear) !==
        normalizeYearToken(student.Academic_Year)
      )
        continue;
      m.set(String(r.subjectId), r);
    }
    return m;
  }, [results, student]);

  const openModal = (subject: Subject) => {
    const existing = resultBySubjectId.get(String(subject._id));
    setActiveSubject(subject);
    setEditingResultId(existing?._id ?? null);
    if (existing) {
      setForm({
        assignment: String(assignmentTotal(existing)),
        mid: String(existing.midTest ?? ""),
        final: String(existing.finalExam ?? ""),
        remarks: existing.remarks ?? "",
      });
    } else {
      setForm({
        assignment: "",
        mid: "",
        final: "",
        remarks: "",
      });
    }
    setModalOpen(true);
  };

  const parseScore = (raw: string, max: number): number => {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(n, max));
  };

  const saveResult = async () => {
    if (!student || !activeSubject) return;
    const assignmentPts = parseScore(form.assignment, MAX_ASSIGNMENT);
    const midPts = parseScore(form.mid, MAX_MID);
    const finalPts = parseScore(form.final, MAX_FINAL);

    setSaving(true);
    try {
      const totalScore = assignmentPts + midPts + finalPts;
      const grade = getUniversityGrade(totalScore);
      const payload = {
        studentId: student.Unique_ID,
        studentName: `${student.First_Name} ${student.Father_Name}`,
        subjectId: activeSubject._id,
        subjectName: activeSubject.name,
        academicYear: student.Academic_Year,
        assignment1: assignmentPts,
        assignment2: 0,
        midTest: midPts,
        finalExam: finalPts,
        totalScore,
        grade,
        remarks: form.remarks.trim(),
        recordedDate: getTodayEthiopianDateISO(),
      };

      if (editingResultId) {
        const resp = await fetch(`/api/student-results/${editingResultId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: payload.studentName,
            subjectName: payload.subjectName,
            assignment1: payload.assignment1,
            assignment2: payload.assignment2,
            midTest: payload.midTest,
            finalExam: payload.finalExam,
            remarks: payload.remarks,
          }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || "Update failed");
        }
      } else {
        const resp = await fetch("/api/student-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || "Save failed");
        }
      }

      await fetchData();
      setModalOpen(false);
      setActiveSubject(null);
      setEditingResultId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteResult = async (rid: string) => {
    if (!confirm("Remove this subject result?")) return;
    try {
      const resp = await fetch(`/api/student-results/${rid}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Delete failed");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!student) return <div className="text-red-500">Student not found</div>;

  const yearLabel = String(student.Academic_Year).includes("EC")
    ? student.Academic_Year
    : `${student.Academic_Year} EC`;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Grade & academic year
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            {student.First_Name} {student.Father_Name}
          </h2>
          <p className="mt-1 text-lg text-gray-700">
            <span className="font-semibold">{student.Grade}</span>
            <span className="mx-2 text-gray-400">·</span>
            <span>{yearLabel}</span>
            <span className="mx-2 text-gray-400">·</span>
            ID {student.Unique_ID}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Subjects for this grade and year. Scores total 100%: Assignment max{" "}
            {MAX_ASSIGNMENT}, Mid exam max {MAX_MID}, Final max {MAX_FINAL}. Use{" "}
            <span className="font-semibold">Edit</span> to add or change scores.
            Missing scores show <span className="font-mono font-semibold">NG</span>
            . <span className="font-semibold">Clear</span> removes a saved result.
          </p>
        </div>
        <Link
          href={backHref}
          className="shrink-0 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          {backLabel}
        </Link>
      </header>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-100 text-left text-gray-700">
              <th className="p-3 font-semibold">Subject</th>
              <th className="p-3 font-semibold">
                Assignment ({MAX_ASSIGNMENT}%)
              </th>
              <th className="p-3 font-semibold">Mid exam ({MAX_MID}%)</th>
              <th className="p-3 font-semibold">Final ({MAX_FINAL}%)</th>
              <th className="p-3 font-semibold">Total /100</th>
              <th className="p-3 font-semibold">Grade</th>
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td className="p-6 text-gray-600" colSpan={7}>
                  No subjects are defined for {student.Grade} in{" "}
                  {student.Academic_Year}. Add subjects under Subject Management.
                </td>
              </tr>
            ) : (
              subjects.map((sub) => {
                const r = resultBySubjectId.get(String(sub._id));
                const hasRow = Boolean(r?._id);
                const assign = hasRow ? assignmentTotal(r!) : undefined;
                const mid = hasRow ? r!.midTest : undefined;
                const fin = hasRow ? r!.finalExam : undefined;
                const total = hasRow
                  ? (assign ?? 0) + (mid ?? 0) + (fin ?? 0)
                  : undefined;

                return (
                  <tr
                    key={sub._id}
                    className="border-b border-gray-100 hover:bg-emerald-50/40"
                  >
                    <td className="p-3 font-medium text-gray-900">{sub.name}</td>
                    <td className="p-3 font-mono">
                      {formatCell(assign, MAX_ASSIGNMENT, hasRow)}
                    </td>
                    <td className="p-3 font-mono">
                      {formatCell(mid, MAX_MID, hasRow)}
                    </td>
                    <td className="p-3 font-mono">
                      {formatCell(fin, MAX_FINAL, hasRow)}
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      {!hasRow ? "NG" : String(total)}
                    </td>
                    <td className="p-3">
                      {!hasRow ? (
                        <span className="text-gray-500">NG</span>
                      ) : (
                        <span className="font-semibold text-emerald-800">
                          {r!.grade}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                          onClick={() => openModal(sub)}
                        >
                          {hasRow ? "Edit" : "Add scores"}
                        </button>
                        {hasRow && r?._id && (
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            onClick={() => deleteResult(r._id!)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && activeSubject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">
              {activeSubject.name}
            </h3>
            <p className="text-sm text-gray-600">
              {student.Grade} · {yearLabel}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assignment (0–{MAX_ASSIGNMENT})
                </label>
                <input
                  type="number"
                  min={0}
                  max={MAX_ASSIGNMENT}
                  step={0.5}
                  value={form.assignment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, assignment: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mid exam (0–{MAX_MID})
                </label>
                <input
                  type="number"
                  min={0}
                  max={MAX_MID}
                  step={0.5}
                  value={form.mid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mid: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Final exam (0–{MAX_FINAL})
                </label>
                <input
                  type="number"
                  min={0}
                  max={MAX_FINAL}
                  step={0.5}
                  value={form.final}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, final: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 p-2"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={saving}
                onClick={saveResult}
              >
                {saving ? "Saving…" : editingResultId ? "Update" : "Save"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
