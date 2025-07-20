"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function StudentsByGrade() {
  const [students, setStudents] = useState<any[]>([]);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch(() => setStudents([]));
  }, []);
  // Only show current academic year
  const currentYear = Math.max(...students.map((s: any) => parseInt(s.Academic_Year)).filter(Boolean));
  const currentYearStudents = students.filter((s: any) => s.Academic_Year === String(currentYear));
  // Group by grade
  const grades = [...new Set(currentYearStudents.map((s: any) => s.Grade))].sort();
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Students by Grade</h1>
      {grades.length === 0 ? (
        <p className="text-gray-600">No students found for the current year.</p>
      ) : (
        grades.map((grade) => (
          <div key={grade} className="mb-4">
            <button
              onClick={() => setExpandedGrade(expandedGrade === grade ? null : grade)}
              className="w-full text-left bg-gray-200 p-3 rounded-lg flex justify-between items-center hover:bg-gray-300"
              aria-expanded={expandedGrade === grade}
            >
              <span className="font-medium">Grade: {grade}</span>
              <span>{expandedGrade === grade ? '▲' : '▼'}</span>
            </button>
            {expandedGrade === grade && (
              <div className="pl-4 pt-2">
                <table className="min-w-full border-collapse border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-3 text-left">ID Number</th>
                      <th className="border p-3 text-left">Name</th>
                      <th className="border p-3 text-left">Sex</th>
                      <th className="border p-3 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentYearStudents.filter((s: any) => s.Grade === grade).map((student: any) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="border p-3">{student.Unique_ID}</td>
                        <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                        <td className="border p-3">{student.Sex}</td>
                        <td className="border p-3 text-center">
                          <Link
                            href={`/facilitator/results/students/${student._id}`}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
} 