"use client";
import { useEffect, useState } from "react";

export default function Subjects() {
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setGrades([...new Set(data.map((s: any) => s.Grade))].sort()))
      .catch(() => setGrades([]));
  }, []);
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Subjects by Grade</h1>
      {grades.length === 0 ? (
        <p className="text-gray-600">No grades found.</p>
      ) : (
        grades.map((grade) => (
          <div key={grade} className="mb-4 flex items-center justify-between">
            <span className="font-medium">Grade: {grade}</span>
            <button className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Add/Edit Subjects</button>
          </div>
        ))
      )}
    </div>
  );
} 