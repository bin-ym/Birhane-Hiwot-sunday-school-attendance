// src/app/students/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Student {
  _id: string;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
  Phone_Number: string;
  Age: number;
  Sex: string;
  Class: string;
  Occupation: string;
  Educational_Background?: string;
  Address: string;
  Academic_Year: string;
  Grade: string;
}

export default function Students() {
  const { status } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSex, setSelectedSex] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    } else if (status === "authenticated") {
      fetch("/api/students")
        .then((res) => res.json())
        .then((data) => setStudents(data))
        .catch(() => setStudents([]));
    }
  }, [status]);

  const filteredStudents = students.filter(
    (student) =>
      (selectedGrade === "" || student.Grade === selectedGrade) &&
      (selectedSex === "" || student.Sex === selectedSex) &&
      ((student.Unique_ID || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (student.First_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Father_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const gradeOptions = [...new Set(students.map((s) => s.Grade))];
  const sexOptions = [...new Set(students.map((s) => s.Sex))];

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const response = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setStudents(students.filter((student) => student._id !== id));
      } else {
        alert("Failed to delete student");
      }
    } catch (error) {
      alert("Error deleting student");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Students List</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search by ID, Name, or Grade"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
        </div>
        <div>
          <label
            htmlFor="classFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Grade
          </label>
          <select
            id="classFilter"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">All Grades</option>
            {gradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="sexFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Sex
          </label>
          <select
            id="sexFilter"
            value={selectedSex}
            onChange={(e) => setSelectedSex(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">All Sexes</option>
            {sexOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="min-w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">ID Number</th>
              <th className="border p-3 text-left">Name</th>
              <th className="border p-3 text-left">Grade</th>
              <th className="border p-3 text-left">Sex</th>
              <th className="border p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50">
                <td className="border p-3">{student.Unique_ID}</td>
                <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                <td className="border p-3">{student.Grade}</td>
                <td className="border p-3">{student.Sex}</td>
                <td className="border p-3 text-center">
                  <Link
                    href={`/students/${student._id}`}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 mr-2"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleDelete(student._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
