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

  const gradeOptions = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

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
        if (!gradeMap.has(subject.grade)) gradeMap.set(subject.grade, []);
        gradeMap.get(subject.grade)!.push(subject);
      });

      const gradesData: Grade[] = Array.from(gradeMap.entries())
        .sort((a, b) => {
          const numA = parseInt(a[0].replace("Grade ", ""), 10);
          const numB = parseInt(b[0].replace("Grade ", ""), 10);
          return numA - numB;
        })
        .map(([name, subjects]) => ({ name, subjects }));

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
          academicYear,
        };
        await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subject),
        });
      }
      await loadSubjects();
    } catch (err) {
      setError("Failed to initialize subjects");
    }
  };

  const addSubject = async () => {
    if (!newSubject.trim() || !selectedGrade || !academicYear)
      return setError("Please fill in all fields");
    try {
      const subject: Subject = {
        name: newSubject.trim(),
        grade: selectedGrade,
        academicYear,
      };
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subject),
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Failed to add subject",
        );

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
      if (!subject?._id) return setError("Subject not found");

      const response = await fetch(`/api/subjects/${subject._id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Failed to remove subject",
        );

      await loadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove subject");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-8 sm:p-12 shadow-2xl text-white transform hover:scale-[1.01] transition-transform duration-500">
        <h2 className="text-4xl font-black tracking-tight mb-2">
          Subject Configurations
        </h2>
        <p className="text-emerald-100/90 max-w-2xl text-lg font-medium">
          Dynamically craft curriculum mapping per grade constraint. Initialize
          defaults instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Manage Box */}
        <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-6">
            Initialize & Add
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-black text-gray-700 uppercase tracking-widest">
                  Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-4 border-2 border-emerald-100 bg-emerald-50/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Grade</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-black text-gray-700 uppercase tracking-widest">
                  Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-4 border-2 border-emerald-100 bg-emerald-50/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Year</option>
                  {[
                    new Date().getFullYear() - 8,
                    new Date().getFullYear() - 7,
                  ].map((y) => (
                    <option key={y} value={y}>
                      {y} EC
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() =>
                  selectedGrade && initializeSubjectsForGrade(selectedGrade)
                }
                disabled={!selectedGrade || !academicYear}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold p-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Auto-Populate Set
              </button>
            </div>
          </div>
        </div>

        {/* Create Custom Box */}
        <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent mb-6">
            Create Custom Subject
          </h3>
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-700 uppercase tracking-widest">
                Subject Name
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. History of the Church"
                className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-gray-800 outline-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={addSubject}
                disabled={!selectedGrade || !newSubject.trim() || !academicYear}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold p-4 rounded-2xl shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Add Custom Subject
              </button>
            </div>
            <p className="text-xs text-gray-400 italic text-center">
              Make sure Grade & Year are selected in the left panel.
            </p>
          </div>
        </div>
      </div>

      {/* Roster View */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border-2 border-dashed border-red-200 text-center font-semibold text-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 pb-12">
          {grades.map((grade) => (
            <div
              key={grade.name}
              className="group bg-white rounded-[2rem] p-6 shadow-md border border-gray-100 hover:shadow-2xl hover:border-emerald-200 transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-800 drop-shadow-sm group-hover:text-emerald-700 transition-colors">
                  {grade.name}
                </h3>
                <div className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {grade.subjects.length} Subjects
                </div>
              </div>

              {grade.subjects.length === 0 ? (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <p className="text-gray-400 font-semibold">Empty Grade</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {grade.subjects.map((subject) => (
                    <div
                      key={subject.name}
                      className="flex justify-between items-center bg-gray-50/80 hover:bg-emerald-50/50 p-4 rounded-2xl border border-gray-100 group/subject transition-colors"
                    >
                      <div className="overflow-hidden pr-4">
                        <h4 className="font-bold text-gray-800 truncate">
                          {subject.name}
                        </h4>
                        <p className="text-xs font-medium text-emerald-600 mt-0.5">
                          {subject.academicYear} EC
                        </p>
                      </div>
                      <button
                        onClick={() => removeSubject(grade.name, subject.name)}
                        className="opacity-0 group-hover/subject:opacity-100 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-sm"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
