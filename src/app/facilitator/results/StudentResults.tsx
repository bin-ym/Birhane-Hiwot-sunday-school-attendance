"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
  assignment1: number;
  assignment2: number;
  midTest: number;
  finalExam: number;
  totalScore: number;      // 0–100
  grade: string;           // A+, A, A-, B+, …
  remarks?: string;
  recordedDate: string;
}

// Maximum points per component
const WEIGHTS = {
  assignment1: 10,
  assignment2: 10,
  midTest:   30,
  finalExam: 50,
};

// University grading scale
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

export default function StudentResults() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResult, setNewResult] = useState({
    subjectId:   "",
    subjectName: "",
    assignment1: 0,
    assignment2: 0,
    midTest:     0,
    finalExam:   0,
    remarks:     "",
  });

  // Fetch student, subjects, and results
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Student
      const studentRes = await fetch(`/api/students/${id}`);
      if (!studentRes.ok) throw new Error("Failed to fetch student");
      const studentData: Student = await studentRes.json();
      setStudent(studentData);

      // 2) Subjects for this grade & year
      const subjectsRes = await fetch(
        `/api/subjects?grade=${studentData.Grade}&academicYear=${studentData.Academic_Year}`
      );
      if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
      setSubjects(await subjectsRes.json());

      // 3) Existing results
      const resultsRes = await fetch(`/api/student-results?studentId=${id}`);
      if (!resultsRes.ok) throw new Error("Failed to fetch results");
      const resultsData: Result[] = await resultsRes.json();
      setResults(resultsData);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  // Compute total score (0–100)
  const computeTotal = (r: Partial<Result>) => {
    const a1 = r.assignment1! || 0;
    const a2 = r.assignment2! || 0;
    const m  = r.midTest!     || 0;
    const f  = r.finalExam!   || 0;
    return a1 + a2 + m + f;
  };

  // Clamp input and recalc
  const handleScoreChange = (field: keyof typeof WEIGHTS, raw: number) => {
    const max = WEIGHTS[field];
    const val = Math.max(0, Math.min(raw, max));
    const updated = { ...newResult, [field]: val };
    setNewResult(updated);
  };

  // Add new result
  const addResult = async () => {
    if (!newResult.subjectId) {
      setError("Please select a subject");
      return;
    }

    try {
      const totalScore = computeTotal(newResult);
      const grade      = getUniversityGrade(totalScore);

      const payload: Omit<Result, "_id"> = {
        studentId:   id!,
        studentName: `${student!.First_Name} ${student!.Father_Name}`,
        subjectId:   newResult.subjectId,
        subjectName: newResult.subjectName,
        academicYear: student!.Academic_Year,
        assignment1:  newResult.assignment1,
        assignment2:  newResult.assignment2,
        midTest:      newResult.midTest,
        finalExam:    newResult.finalExam,
        totalScore,
        grade,
        remarks:      newResult.remarks,
        recordedDate: getTodayEthiopianDateISO(),
      };

      const resp = await fetch("/api/student-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errorBody = await resp.json();
        throw new Error(errorBody.error || resp.statusText);
      }
      const saved: Result = await resp.json();
      setResults((p) => [...p, saved]);
      // reset
      setShowAddForm(false);
      setNewResult({
        subjectId:   "",
        subjectName: "",
        assignment1: 0,
        assignment2: 0,
        midTest:     0,
        finalExam:   0,
        remarks:     "",
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add result");
    }
  };

  // Delete a result
  const deleteResult = async (rid: string) => {
    try {
      const resp = await fetch(`/api/student-results/${rid}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const errorBody = await resp.json();
        throw new Error(errorBody.error || resp.statusText);
      }
      setResults((p) => p.filter((r) => r._id !== rid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete result");
    }
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error)   return <div className="text-red-500">{error}</div>;
  if (!student) return <div className="text-red-500">Student not found</div>;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Results for {student.First_Name} {student.Father_Name}</h2>
          <p className="text-gray-600">{student.Grade} ({student.Academic_Year})</p>
        </div>
        <Link
          href="/facilitator/results/students"
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Back
        </Link>
      </header>

      {/* Add Form */}
      <div className="bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Result</h3>
          <button
            onClick={() => setShowAddForm((f) => !f)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "Add Result"}
          </button>
        </div>

        {showAddForm && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Subject</label>
              <select
                value={newResult.subjectId}
                onChange={(e) => {
                  const sid = e.target.value;
                  const subj = subjects.find((s) => s._id === sid);
                  setNewResult((p) => ({
                    ...p,
                    subjectId: sid,
                    subjectName: subj?.name || "",
                  }));
                }}
                className="mt-1 p-2 border rounded w-full"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {Object.entries(WEIGHTS).map(([field, max]) => (
              <div key={field}>
                <label className="block text-sm font-medium">
                  {field.charAt(0).toUpperCase() + field.slice(1)} ({max}%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={(newResult as any)[field]}
                  onChange={(e) =>
                    handleScoreChange(field as keyof typeof WEIGHTS, +e.target.value)
                  }
                  className="mt-1 p-2 border rounded w-full"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium">Remarks</label>
              <input
                type="text"
                value={newResult.remarks}
                onChange={(e) =>
                  setNewResult((p) => ({ ...p, remarks: e.target.value }))
                }
                className="mt-1 p-2 border rounded w-full"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-3">
              <button
                onClick={addResult}
                className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
              >
                Save Result
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Existing Results</h3>
        {results.length === 0 ? (
          <p className="text-gray-600">No results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Subject</th>
                  {Object.keys(WEIGHTS).map((f) => (
                    <th key={f} className="p-2 border">{f}</th>
                  ))}
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Grade</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="p-2 border">{r.subjectName}</td>
                    {Object.keys(WEIGHTS).map((f) => (
                      <td key={f} className="p-2 border">{(r as any)[f]}</td>
                    ))}
                    <td className="p-2 border font-medium">{r.totalScore}</td>
                    <td className="p-2 border">{r.grade}</td>
                    <td className="p-2 border">{r.recordedDate}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => deleteResult(r._id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}