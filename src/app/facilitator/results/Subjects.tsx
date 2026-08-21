"use client";
import { useState, useEffect } from "react";
import { getSundaysInEthiopianYear } from "@/lib/utils";

/** A grade+year group returned by the API. */
interface SubjectGroup {
  _id: string;
  academicYear: string;
  grade: string;
  gradeNumber?: number;
  subjects: string[];
}

interface Grade {
  name: string;
  group: SubjectGroup | null;
}

// Predefined subjects for each grade
const GRADE_SUBJECTS = {
  "Grade 1": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ሥርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 2": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 3": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 4": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 5": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 6": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 7": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 8": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 9": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 10": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 11": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 12": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያኝ",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
};

/** Derive a numeric grade number from a grade name string. */
function getGradeNumber(name: string): number {
  if (name === "ቅድመ መደበኛ") return 0;
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export default function Subjects() {
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
    String(currentEthiopianYear - i),
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

  const [groups, setGroups] = useState<SubjectGroup[]>([]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load subjects");

      // API returns grouped format directly
      setGroups(data);
      setError(null);
    } catch (err) {
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  // Build Grade[] for display from grouped data
  const buildGrades = (groupList: SubjectGroup[]): Grade[] => {
    const groupMap = new Map<string, SubjectGroup>();
    groupList.forEach((g) => groupMap.set(g.grade, g));
    return gradeOptions.map((name) => ({
      name,
      group: groupMap.get(name) || null,
    }));
  };

  const grades = buildGrades(groups);

  const initializeSubjectsForGrade = async (gradeName: string) => {
    const subjectsForGrade =
      GRADE_SUBJECTS[gradeName as keyof typeof GRADE_SUBJECTS] || [];
    if (subjectsForGrade.length === 0) return;

    try {
      const response = await fetch("/api/subjects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: subjectsForGrade.map((name) => ({
            name,
            grade: gradeName,
            gradeNumber: getGradeNumber(gradeName),
            academicYear,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.warn("Batch init failed:", data.error);
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
      const payload = {
        name: newSubject.trim(),
        grade: selectedGrade,
        gradeNumber: getGradeNumber(selectedGrade),
        academicYear: academicYear,
      };

      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const removeSubject = async (groupId: string, subjectName: string) => {
    try {
      const response = await fetch(`/api/subjects/${groupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subjectName }),
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
                `${new Date().getFullYear() - 8}`, // Current Ethiopian Year
                `${new Date().getFullYear() - 7}`, // Next Ethiopian Year
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
                `${new Date().getFullYear() - 8}`, // Current Ethiopian Year
                `${new Date().getFullYear() - 7}`, // Next Ethiopian Year
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
            {!grade.group || grade.group.subjects.length === 0 ? (
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
                {grade.group.subjects.map((subject) => (
                  <div
                    key={subject}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{subject}</span>
                      <div className="text-sm text-gray-500">
                        {grade.group!.academicYear}
                      </div>
                    </div>
                    <button
                      onClick={() => removeSubject(grade.group!._id, subject)}
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
