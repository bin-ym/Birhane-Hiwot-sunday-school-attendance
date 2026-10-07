// src/components/tabs/ResultsTab.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Result, Student, UserRole } from "@/lib/models";
import { getTodayEthiopianDateISO } from "@/lib/utils";

/** Grouped subject doc from the API. */
interface SubjectGroup {
  _id: string;
  academicYear: string;
  grade: string;
  gradeNumber?: number;
  subjects: string[];
}

/** Flattened subject for display. */
interface Subject {
  _id?: string;
  name: string;
  grade: string;
  gradeNumber?: number;
  academicYear: string;
}

interface ResultsTabProps {
  studentId: string;
  student?: Student;
  userRole?: UserRole;
  allowCRUD?: boolean;
}

function normalizeYearToken(y: string): string {
  const digits = String(y).replace(/\D/g, "");
  const n = parseInt(digits.slice(0, 4), 10);
  return Number.isFinite(n) ? String(n) : String(y).trim();
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

const MANAGERIAL_ROLES: UserRole[] = [
  "Super Admin",
  "Education Admin",
  "Education Facilitator",
  "HR Admin",
];

import { getGradeNumberByName } from "@/lib/constants";

function normalizeSubjectName(s?: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .replace(/[\s\-\_]+/g, "")
    .replace(/ሥ/g, "ስ");
}

export default function ResultsTab({
  studentId,
  student: initialStudent,
  userRole,
  allowCRUD,
}: ResultsTabProps) {
  const [student, setStudent] = useState<Student | null>(
    initialStudent || null,
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state for Add & Edit scores
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<{
    _id?: string;
    name: string;
  } | null>(null);
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  const [form, setForm] = useState({
    assignment1: "",
    assignment2: "",
    midTest: "",
    finalExam: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  const canManage =
    allowCRUD || (userRole ? MANAGERIAL_ROLES.includes(userRole) : true);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let currentStudent = student;
      if (!currentStudent && studentId) {
        const studentRes = await fetch(
          `/api/students?uniqueId=${encodeURIComponent(studentId)}`,
        );
        if (studentRes.ok) {
          const data = await studentRes.json();
          if (Array.isArray(data) && data.length > 0) {
            currentStudent = data[0];
          } else if (data && !Array.isArray(data)) {
            currentStudent = data;
          }
        }
      }

      if (currentStudent) {
        setStudent(currentStudent);
      }

      // 1. Fetch curriculum subjects (grouped format)
      const subjectsRes = await fetch("/api/subjects");
      if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
      const allGroups: SubjectGroup[] = await subjectsRes.json();

      if (currentStudent) {
        const yStu = normalizeYearToken(currentStudent.Academic_Year);
        const studentGradeNum = getGradeNumberByName(currentStudent.Grade);

        // Flatten: find matching groups and extract subject names
        const flatSubjects: Subject[] = [];
        for (const group of allGroups) {
          const yearMatches = normalizeYearToken(group.academicYear) === yStu;
          if (!yearMatches) continue;

          // Grade matching
          let gradeMatch = group.grade === currentStudent?.Grade;
          if (!gradeMatch) {
            const gNum = getGradeNumberByName(group.grade) || (group.gradeNumber ?? 0);
            if (studentGradeNum > 0 && gNum === studentGradeNum) gradeMatch = true;
          }
          if (!gradeMatch) {
            // Substring fallback for Grade 7 / ሰባተኛ
            if (
              (currentStudent?.Grade.includes("ሰባተኛ") || currentStudent?.Grade.includes("7")) &&
              (group.grade.includes("ሰባተኛ") || group.grade.includes("7") || group.grade.includes("Grade 7"))
            ) {
              gradeMatch = true;
            }
          }
          if (!gradeMatch) continue;

          // Each subject string gets a synthetic ID based on group + name
          for (const subjectName of group.subjects) {
            flatSubjects.push({
              _id: `${group._id}_${subjectName}`,
              name: subjectName,
              grade: group.grade,
              gradeNumber: group.gradeNumber,
              academicYear: group.academicYear,
            });
          }
        }

        // Deduplicate by normalized subject name
        const uniqueSubjectsMap = new Map<string, Subject>();
        flatSubjects.forEach((s) => {
          const key = normalizeSubjectName(s.name);
          const existing = uniqueSubjectsMap.get(key);
          if (!existing) {
            uniqueSubjectsMap.set(key, s);
          } else if (s.grade === currentStudent?.Grade) {
            uniqueSubjectsMap.set(key, s);
          }
        });

        setSubjects(Array.from(uniqueSubjectsMap.values()));
      } else {
        // No student — flatten all groups
        const allFlat: Subject[] = [];
        for (const group of allGroups) {
          for (const name of group.subjects) {
            allFlat.push({
              _id: `${group._id}_${name}`,
              name,
              grade: group.grade,
              gradeNumber: group.gradeNumber,
              academicYear: group.academicYear,
            });
          }
        }
        setSubjects(allFlat);
      }

      // 2. Fetch recorded student results
      const resultsRes = await fetch(
        `/api/student-results?studentId=${encodeURIComponent(studentId)}`,
      );
      if (!resultsRes.ok) throw new Error("Failed to fetch results");
      setResults(await resultsRes.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [studentId, student]);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId, fetchData]);

  // Build a map of subjectId / subjectName -> Result
  const resultMap = useMemo(() => {
    const m = new Map<string, Result>();
    results.forEach((r) => {
      if (!r) return;
      if (r.subjectId) m.set(String(r.subjectId), r);
      if (r.subjectName && typeof r.subjectName === "string") {
        m.set(r.subjectName.toLowerCase(), r);
        const normKey = normalizeSubjectName(r.subjectName);
        if (normKey) m.set(normKey, r);
      }
    });
    return m;
  }, [results]);

  // Open Modal to Create or Edit
  const openModal = (
    subj?: { _id?: string; name: string },
    existingResult?: Result,
  ) => {
    if (subj) {
      setIsCustomSubject(false);
      setActiveSubject(subj);
      const sName = subj.name && typeof subj.name === "string" ? subj.name : "";
      const existing =
        existingResult ||
        (subj._id ? resultMap.get(String(subj._id)) : undefined) ||
        (sName ? resultMap.get(sName.toLowerCase()) : undefined) ||
        (sName ? resultMap.get(normalizeSubjectName(sName)) : undefined);

      setEditingResultId(existing?._id?.toString() || null);
      if (existing) {
        setForm({
          assignment1:
            existing.assignment1 !== undefined
              ? String(existing.assignment1)
              : "",
          assignment2:
            existing.assignment2 !== undefined
              ? String(existing.assignment2)
              : "",
          midTest:
            existing.midTest !== undefined ? String(existing.midTest) : "",
          finalExam:
            existing.finalExam !== undefined ? String(existing.finalExam) : "",
          remarks: existing.remarks || "",
        });
      } else {
        setForm({
          assignment1: "",
          assignment2: "",
          midTest: "",
          finalExam: "",
          remarks: "",
        });
      }
    } else {
      // New custom subject
      setIsCustomSubject(true);
      setActiveSubject(null);
      setCustomSubjectName("");
      setEditingResultId(null);
      setForm({
        assignment1: "",
        assignment2: "",
        midTest: "",
        finalExam: "",
        remarks: "",
      });
    }
    setModalOpen(true);
  };

  // Save / Update result
  const handleSaveResult = async () => {
    if (!student) return;
    const targetSubjectName = isCustomSubject
      ? customSubjectName.trim()
      : activeSubject?.name;

    if (!targetSubjectName) {
      alert("Please specify a subject name.");
      return;
    }

    const a1 = parseFloat(form.assignment1) || 0;
    const a2 = parseFloat(form.assignment2) || 0;
    const mid = parseFloat(form.midTest) || 0;
    const final = parseFloat(form.finalExam) || 0;

    const totalScore = a1 + a2 + mid + final;
    const grade = getUniversityGrade(totalScore);

    setSaving(true);
    try {
      const payload = {
        studentId: student.Unique_ID,
        studentName:
          `${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name || ""}`.trim(),
        subjectId: activeSubject?._id || targetSubjectName,
        subjectName: targetSubjectName,
        academicYear: student.Academic_Year,
        assignment1: a1,
        assignment2: a2,
        midTest: mid,
        finalExam: final,
        totalScore,
        grade,
        remarks: form.remarks.trim(),
        recordedDate: getTodayEthiopianDateISO(),
      };

      if (editingResultId) {
        const res = await fetch(`/api/student-results/${editingResultId}`, {
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
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update result");
        }
      } else {
        const res = await fetch("/api/student-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to save result");
        }
      }

      await fetchData();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Error saving score");
    } finally {
      setSaving(false);
    }
  };

  // Delete result
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to clear/delete this recorded result?"))
      return;
    try {
      const res = await fetch(`/api/student-results/${resultId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete result");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Error deleting result");
    }
  };

  if (loading)
    return <div className="text-gray-500 py-4">Loading results…</div>;
  if (error) return <div className="text-red-500 py-4">{error}</div>;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-gray-800">
            Curriculum & Student Results
          </h3>
          {student && (
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Grade:{" "}
              <span className="text-emerald-700 font-bold">
                {student.Grade}
              </span>{" "}
              · Academic Year:{" "}
              <span className="text-emerald-700 font-bold">
                {student.Academic_Year}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
            <tr>
              <th className="p-3.5 text-left font-bold">Subject</th>
              <th className="p-3.5 text-center font-bold">Assign 1 (20)</th>
              <th className="p-3.5 text-center font-bold">Assign 2 (20)</th>
              <th className="p-3.5 text-center font-bold">Mid (30)</th>
              <th className="p-3.5 text-center font-bold">Final (50)</th>
              <th className="p-3.5 text-center font-bold">Total</th>
              <th className="p-3.5 text-center font-bold">Grade</th>
              <th className="p-3.5 text-left font-bold">Remarks</th>
              {canManage && (
                <th className="p-3.5 text-right font-bold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subjects.length === 0 && results.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 9 : 8}
                  className="p-8 text-center text-gray-500 font-medium"
                >
                  No curriculum subjects or recorded results found for this
                  student.
                </td>
              </tr>
            ) : subjects.length > 0 ? (
              subjects.map((sub) => {
                const subName =
                  sub?.name && typeof sub.name === "string" ? sub.name : "";
                const r =
                  (sub?._id ? resultMap.get(String(sub._id)) : undefined) ||
                  (subName
                    ? resultMap.get(subName.toLowerCase())
                    : undefined) ||
                  (subName
                    ? resultMap.get(normalizeSubjectName(subName))
                    : undefined);

                const hasResult = Boolean(r && r._id);

                return (
                  <tr
                    key={sub._id || sub.name}
                    className="hover:bg-emerald-50/30 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-gray-900">
                      {sub.name}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {r?.assignment1 !== undefined ? r.assignment1 : "NG"}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {r?.assignment2 !== undefined ? r.assignment2 : "NG"}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {r?.midTest !== undefined ? r.midTest : "NG"}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {r?.finalExam !== undefined ? r.finalExam : "NG"}
                    </td>
                    <td className="p-3.5 text-center font-extrabold text-gray-900">
                      {r?.totalScore !== undefined ? r.totalScore : "NG"}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-black ${r?.grade && r.grade !== "NG" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}
                      >
                        {r?.grade || "NG"}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-500 text-xs">
                      {r?.remarks || "-"}
                    </td>

                    {canManage && (
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openModal(sub, r)}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
                          >
                            {hasResult ? "Edit" : "+ Add"}
                          </button>
                          {hasResult && r?._id && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteResult(r._id!.toString())
                              }
                              className="px-2.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition"
                              title="Clear Result"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              results.map((r) => (
                <tr
                  key={r._id?.toString() || r.subjectName}
                  className="hover:bg-emerald-50/30 transition-colors"
                >
                  <td className="p-3.5 font-bold text-gray-900">
                    {r.subjectName}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {r.assignment1 !== undefined ? r.assignment1 : "NG"}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {r.assignment2 !== undefined ? r.assignment2 : "NG"}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {r.midTest !== undefined ? r.midTest : "NG"}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {r.finalExam !== undefined ? r.finalExam : "NG"}
                  </td>
                  <td className="p-3.5 text-center font-extrabold text-gray-900">
                    {r.totalScore !== undefined ? r.totalScore : "NG"}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800">
                      {r.grade || "NG"}
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-500 text-xs">
                    {r.remarks || "-"}
                  </td>

                  {canManage && (
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openModal({ name: r.subjectName }, r)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
                        >
                          Edit
                        </button>
                        {r._id && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteResult(r._id!.toString())
                            }
                            className="px-2.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT RESULT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-emerald-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  {editingResultId
                    ? "Update Student Result"
                    : "Record Student Result"}
                </h3>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  {student?.First_Name} {student?.Father_Name} · ID:{" "}
                  {student?.Unique_ID}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition"
              >
                &times;
              </button>
            </div>

            {/* Subject Name Input */}
            {isCustomSubject ? (
              <label className="block space-y-1">
                <span className="text-xs font-bold text-gray-700">
                  Subject Name *
                </span>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="e.g. ቅዱስ ቁርባን"
                />
              </label>
            ) : (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs text-emerald-700 font-bold block uppercase tracking-wider">
                  Subject
                </span>
                <span className="text-base font-extrabold text-emerald-900">
                  {activeSubject?.name}
                </span>
              </div>
            )}

            {/* Scores Grid */}
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-bold text-gray-700">
                  Assignment 1 (Max 20)
                </span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  value={form.assignment1}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assignment1: e.target.value,
                    }))
                  }
                  placeholder="0 - 20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gray-700">
                  Assignment 2 (Max 20)
                </span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  value={form.assignment2}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assignment2: e.target.value,
                    }))
                  }
                  placeholder="0 - 20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gray-700">
                  Mid Exam (Max 30)
                </span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  value={form.midTest}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, midTest: e.target.value }))
                  }
                  placeholder="0 - 30"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gray-700">
                  Final Exam (Max 50)
                </span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  value={form.finalExam}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, finalExam: e.target.value }))
                  }
                  placeholder="0 - 50"
                />
              </label>
            </div>

            {/* Total Preview */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">
                Calculated Total / Grade:
              </span>
              <span className="text-sm font-black text-emerald-800 font-mono">
                {(parseFloat(form.assignment1) || 0) +
                  (parseFloat(form.assignment2) || 0) +
                  (parseFloat(form.midTest) || 0) +
                  (parseFloat(form.finalExam) || 0)}{" "}
                pts · Grade:{" "}
                {getUniversityGrade(
                  (parseFloat(form.assignment1) || 0) +
                    (parseFloat(form.assignment2) || 0) +
                    (parseFloat(form.midTest) || 0) +
                    (parseFloat(form.finalExam) || 0),
                )}
              </span>
            </div>

            {/* Remarks */}
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-700">
                Remarks (Optional)
              </span>
              <input
                type="text"
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                value={form.remarks}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="e.g. Great performance"
              />
            </label>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition disabled:bg-gray-300"
              >
                {saving
                  ? "Saving Result..."
                  : editingResultId
                    ? "Update Result"
                    : "Save Result"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-3 border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold rounded-xl text-sm transition"
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
