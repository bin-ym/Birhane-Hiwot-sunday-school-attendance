"use client";
import { useState, useEffect } from "react";
import { getSundaysInEthiopianYear } from "@/lib/utils";

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

// Predefined subjects for each grade
const GRADE_SUBJECTS = {
  "Grade 1": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ሥርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 2": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 3": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 4": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 5": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 6": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 7": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 8": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 9": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 10": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 11": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 12": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ሥነ ምግባር",
    "የቤተ-ክርስቲያኝ ታሪክ",
    "ሥሷተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
};

export default function Subjects() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sundays, setSundays] = useState<string[]>([]);

  const gradeOptions = [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ];
  const currentEthiopianYear = new Date().getFullYear() - 8;

  // Academic year options (e.g., last 5 years)
  const academicYearOptions = Array.from({ length: 5 }, (_, i) =>
    String(currentEthiopianYear - i)
  );

  // Update Sundays when academic year changes
  useEffect(() => {
    if (academicYear) {
      const sundaysInYear = getSundaysInEthiopianYear(Number(academicYear));
      setSundays(sundaysInYear);
    }
  }, [academicYear]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load subjects");

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

  const initializeSubjectsForGrade = async (gradeName: string) => {
    const subjectsForGrade =
      GRADE_SUBJECTS[gradeName as keyof typeof GRADE_SUBJECTS] || [];

    try {
      for (const subjectName of subjectsForGrade) {
        const subject: Subject = {
          name: subjectName,
          grade: gradeName,
          academicYear: academicYear,
        };

        const response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subject),
        });

        if (!response.ok) {
          const data = await response.json();
          console.warn(`Failed to add subject ${subjectName}:`, data.error);
        }
      }

      await loadSubjects();
    } catch (err) {
      setError("Failed to initialize subjects");
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

      await loadSubjects();
      setNewSubject("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subject");
    }
  };

  const removeSubject = async (gradeName: string, subjectName: string) => {
    try {
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
      {/* Initialize Subjects Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">
          Initialize Subjects for Grade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {[
                `${new Date().getFullYear() - 8
                }`, // Current Ethiopian Year
                `${new Date().getFullYear() - 7
                }`, // Next Ethiopian Year
              ].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                selectedGrade && initializeSubjectsForGrade(selectedGrade)
              }
              disabled={!selectedGrade}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Initialize Subjects
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          This will add all predefined subjects for the selected grade.
        </p>
      </div>

      {/* Add Individual Subject Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add Individual Subject</h3>
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
              {[
                `${new Date().getFullYear() - 8
                }`, // Current Ethiopian Year
                `${new Date().getFullYear() - 7
                }`, // Next Ethiopian Year
              ].map((year) => (
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
              disabled={!selectedGrade || !newSubject.trim()}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No subjects assigned to this grade.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the &quot;Initialize Subjects&quot; section above to add
                  predefined subjects.
                </p>
              </div>
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
