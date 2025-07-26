"use client";
import { useEffect, useState } from "react";

export default function TeachersAttendance() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((res) => res.json())
      .then((data) => setTeachers(data))
      .catch(() => setTeachers([]));
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setGrades([...new Set(data.map((s: any) => s.Grade))].sort()))
      .catch(() => setGrades([]));
  }, []);

  const handleAssignment = (teacherId: string, grade: string) => {
    setAssignments((prev) => ({ ...prev, [teacherId]: grade }));
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Teachers Assignment</h1>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-4"
        onClick={() => setShowAssign((v) => !v)}
      >
        Assign Teachers
      </button>
      {showAssign && (
        <div className="mb-6">
          <table className="min-w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Email</th>
                <th className="border p-3 text-left">Assign to Grade</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher: any) => (
                <tr key={teacher._id} className="hover:bg-gray-50">
                  <td className="border p-3">{teacher.name || "-"}</td>
                  <td className="border p-3">{teacher.email}</td>
                  <td className="border p-3 text-center">
                    <select
                      value={assignments[teacher._id] || ""}
                      onChange={(e) => handleAssignment(teacher._id, e.target.value)}
                      className="p-2 border rounded"
                    >
                      <option value="">Unassigned</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 