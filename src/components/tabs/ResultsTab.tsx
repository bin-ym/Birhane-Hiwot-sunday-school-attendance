// src/components/tabs/ResultsTab.tsx
"use client";

import { useState, useEffect } from "react";

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
  totalScore: number;
  grade: string;
  remarks?: string;
  recordedDate: string;
}

export default function ResultsTab({ studentId }: { studentId: string }) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      try {
        // ✅ Filter by studentId
        const res = await fetch(`/api/student-results?studentId=${studentId}`);
        if (!res.ok) throw new Error("Failed to fetch results");
        setResults(await res.json());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      fetchResults();
    }
  }, [studentId]);

  if (loading) return <div className="text-gray-500">Loading results…</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (results.length === 0) return <div>No results found for this student.</div>;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold mb-4">Student Results</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Subject</th>
              <th className="p-2 border">Assignment 1</th>
              <th className="p-2 border">Assignment 2</th>
              <th className="p-2 border">Mid-Test</th>
              <th className="p-2 border">Final Exam</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Grade</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="p-2 border">{r.subjectName}</td>
                <td className="p-2 border">{r.assignment1}</td>
                <td className="p-2 border">{r.assignment2}</td>
                <td className="p-2 border">{r.midTest}</td>
                <td className="p-2 border">{r.finalExam}</td>
                <td className="p-2 border font-medium">{r.totalScore}</td>
                <td className="p-2 border">{r.grade}</td>
                <td className="p-2 border">{r.recordedDate}</td>
                <td className="p-2 border">{r.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}