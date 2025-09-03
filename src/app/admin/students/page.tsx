"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { StudentFormModal } from "@/components/student-form-modal";
import Papa from "papaparse";

interface Student {
  _id: string;
  name: string;
  studentId: string;
  grade: string;
  academicYear: string;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<string[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch students
  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();
        setStudents(data);
      } catch (err) {
        setError("Error fetching students");
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  // Unique years
  const yearOptions = [...new Set(students.map((s) => s.academicYear))].sort();

  // Grade options grouped by year
  const gradeOptionsByYear: Record<string, string[]> = {};
  yearOptions.forEach((year) => {
    gradeOptionsByYear[year] = [
      ...new Set(
        students.filter((s) => s.academicYear === year).map((s) => s.grade)
      ),
    ].sort();
  });

  // Toggle expand year
  const toggleYear = (year: string) => {
    setExpandedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  // Toggle expand grade
  const toggleGrade = (grade: string) => {
    setExpandedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  // Filter students by search query
  const searchFilter = (list: Student[]) =>
    list.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.grade.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Add student
  const handleAddStudent = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  // Edit student
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  // Delete student
  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student");
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert("Error deleting student");
    }
  };

  // Save student (add or edit)
  const handleSaveStudent = async (studentData: Omit<Student, "_id">) => {
    try {
      const method = selectedStudent ? "PUT" : "POST";
      const url = selectedStudent
        ? `/api/students/${selectedStudent._id}`
        : "/api/students";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });

      if (!res.ok) throw new Error("Failed to save student");
      const savedStudent = await res.json();

      setStudents((prev) =>
        selectedStudent
          ? prev.map((s) =>
              s._id === savedStudent._id ? savedStudent : s
            )
          : [...prev, savedStudent]
      );

      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      alert("Error saving student");
    }
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importedStudents: Omit<Student, "_id">[] = results.data.map(
          (row: any) => ({
            name: row.name,
            studentId: row.studentId,
            grade: row.grade,
            academicYear: row.academicYear,
          })
        );

        try {
          const res = await fetch("/api/students/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(importedStudents),
          });

          if (!res.ok) throw new Error("Failed to import students");
          const savedStudents = await res.json();
          setStudents((prev) => [...prev, ...savedStudents]);
        } catch (err) {
          alert("Error importing students");
        }
      },
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(students);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "students.csv");
    link.click();
  };

  if (loading) return <p className="text-center">Loading students...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Manage Students</h2>
        <div className="flex gap-2">
          <Button onClick={handleAddStudent}>Add Student</Button>
          <Button onClick={handleExportCSV}>Export CSV</Button>
          <label>
            <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
            <Button>
              <span>Import CSV</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center mb-4">
        <Search className="w-5 h-5 text-gray-500 mr-2" />
        <Input
          placeholder="Search by name, ID, or grade"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Students by Year → Grade → Table */}
      <div className="space-y-6">
        {yearOptions.map((year) => (
          <div key={`year-${year}`} className="border rounded-lg">
            {/* Year header */}
            <button
              onClick={() => toggleYear(year)}
              className="w-full text-left bg-gray-200 p-3 rounded-t-lg flex justify-between items-center hover:bg-gray-300"
            >
              <span className="font-medium">Academic Year: {year}</span>
              <span>{expandedYears.includes(year) ? "▲" : "▼"}</span>
            </button>

            {/* Grades inside year */}
            {expandedYears.includes(year) &&
              gradeOptionsByYear[year].map((grade) => {
                const studentsInGrade = searchFilter(
                  students.filter(
                    (s) => s.academicYear === year && s.grade === grade
                  )
                );

                return (
                  <div key={`${year}-${grade}`} className="mb-6 border rounded-lg">
                    {/* Grade header */}
                    <button
                      onClick={() => toggleGrade(`${year}-${grade}`)}
                      className="w-full text-left bg-gray-100 p-3 rounded-t-lg flex justify-between items-center hover:bg-gray-200"
                    >
                      <span className="font-medium">Grade: {grade}</span>
                      <span>
                        {expandedGrades.includes(`${year}-${grade}`) ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Student table inside grade */}
                    {expandedGrades.includes(`${year}-${grade}`) && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border mt-2">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="p-2 border">Name</th>
                              <th className="p-2 border">Student ID</th>
                              <th className="p-2 border">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsInGrade.length > 0 ? (
                              studentsInGrade.map((student) => (
                                <tr
                                  key={student._id || student.studentId}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="p-2 border">{student.name}</td>
                                  <td className="p-2 border">{student.studentId}</td>
                                  <td className="p-2 border flex gap-2">
                                    <Button onClick={() => handleEditStudent(student)}>
                                      Edit
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteStudent(student._id!)}
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="text-center p-2 text-gray-500"
                                >
                                  No students found for this grade.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <StudentFormModal
          student={selectedStudent}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
}