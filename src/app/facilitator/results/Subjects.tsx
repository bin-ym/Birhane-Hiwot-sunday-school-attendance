"use client";
import { useState, useEffect } from "react";

interface Subject {
  _id?: string;
  name: string;
  grade: string;
  academicYear: string;
}

interface Grade {
  name: string;
  subjects: Subject[];
}

export default function Subjects() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample grades - in a real app, these would come from an API
  const gradeOptions = [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];
  const academicYearOptions = ["2024-2025", "2025-2026", "2026-2027"];

  useEffect(() => {
    // Load existing subjects from API
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load subjects");
      }

      // Group subjects by grade
      const gradeMap = new Map<string, Subject[]>();
      data.forEach((subject: Subject) => {
        if (!gradeMap.has(subject.grade)) {
          gradeMap.set(subject.grade, []);
        }
        gradeMap.get(subject.grade)!.push(subject);
      });

      const gradesData: Grade[] = Array.from(gradeMap.entries()).map(
        ([gradeName, subjects]) => ({
          name: gradeName,
          subjects: subjects,
        })
      );

      setGrades(gradesData);
      setError(null);
    } catch (err) {
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async () => {
    if (!newSubject.trim() || !selectedGrade || !academicYear) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const subject: Subject = {
        name: newSubject.trim(),
        grade: selectedGrade,
        academicYear: academicYear,
      };

      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add subject");
      }

      // Reload subjects to get the updated list
      await loadSubjects();

      setNewSubject("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subject");
    }
  };

  const removeSubject = async (gradeName: string, subjectName: string) => {
    try {
      // Find the subject to get its ID
      const grade = grades.find((g) => g.name === gradeName);
      const subject = grade?.subjects.find((s) => s.name === subjectName);

      if (!subject?._id) {
        setError("Subject not found");
        return;
      }

      const response = await fetch(`/api/subjects/${subject._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove subject");
      }

      // Reload subjects to get the updated list
      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove subject");
    }
  };

  if (loading) return <div className="text-gray-500">Loading subjects...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Subject Management</h2>

      {/* Add New Subject */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add New Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select Grade</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select Year</option>
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Enter subject name"
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addSubject}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700"
            >
              Add Subject
            </button>
          </div>
        </div>
      </div>

      {/* Display Subjects by Grade */}
      <div className="space-y-4">
        {grades.map((grade) => (
          <div key={grade.name} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">{grade.name}</h3>
            {grade.subjects.length === 0 ? (
              <p className="text-gray-500">
                No subjects assigned to this grade.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grade.subjects.map((subject) => (
                  <div
                    key={subject.name}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{subject.name}</span>
                      <div className="text-sm text-gray-500">
                        {subject.academicYear}
                      </div>
                    </div>
                    <button
                      onClick={() => removeSubject(grade.name, subject.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
