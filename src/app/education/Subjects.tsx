"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getCurrentEthiopianYear } from "@/lib/utils";

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

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

// Predefined subjects for each grade
const GRADE_SUBJECTS: Record<string, string[]> = {
  "ቅድመ መደበኛ": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
  ],
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
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 6": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 7": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 8": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 9": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 10": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 11": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
  "Grade 12": [
    "መሠረተ ሃይማኖት",
    "ክርስቲያናዊ ስነ-ምግባር",
    "የቤተ-ክርስቲያን ታሪክ",
    "ስርዓተ ቤተ-ክርስቲያን",
    "የመጽሐፍ ቅዱስ ጥናት",
    "የግእዝ ቋንቋ ት/ት",
  ],
};

// All canonical grade names for display (sorted)
const ALL_GRADE_NAMES = ["ቅድመ መደበኛ", ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];

/** Derive a numeric grade number from a grade name string. */
function getGradeNumber(name: string): number {
  if (name === "ቅድመ መደበኛ") return 0;
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Helper to sort grade names numerically
function sortGrades(grades: string[]): string[] {
  return [...grades].sort((a, b) => {
    if (a === "ቅድመ መደበኛ") return -1;
    if (b === "ቅድመ መደበኛ") return 1;
    const numA = parseInt(a.replace("Grade ", ""), 10);
    const numB = parseInt(b.replace("Grade ", ""), 10);
    return numA - numB;
  });
}

export default function Subjects() {
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [rosterYear, setRosterYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ groupId: string; subjectName: string; gradeName: string } | null>(null);
  const [busyAction, setBusyAction] = useState<"init" | "add" | "delete" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  const currentEthiopianYear = getCurrentEthiopianYear();

  // Academic year options
  const academicYearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => String(currentEthiopianYear - 2 + i)),
    [currentEthiopianYear],
  );

  // Default to current year on mount
  useEffect(() => {
    const year = String(currentEthiopianYear);
    setAcademicYear(year);
    setRosterYear(year);
  }, [currentEthiopianYear]);

  // Toast notification system
  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load grouped subjects from API
  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load subjects");

      setGroups(data);
      setError(null);
    } catch (err) {
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Filter groups by selected roster year
  const filteredGroups = useMemo(() => {
    if (!rosterYear) return groups;
    return groups.filter((g) => g.academicYear === rosterYear);
  }, [groups, rosterYear]);

  // Build Grade[] for display roster
  const displayGrades: Grade[] = useMemo(() => {
    const groupMap = new Map<string, SubjectGroup>();
    filteredGroups.forEach((g) => groupMap.set(g.grade, g));

    return sortGrades(ALL_GRADE_NAMES).map((name) => ({
      name,
      group: groupMap.get(name) || null,
    }));
  }, [filteredGroups]);

  // Filter by search query
  const filteredGrades = useMemo(() => {
    if (!searchQuery.trim()) return displayGrades;
    const q = searchQuery.toLowerCase();
    return displayGrades.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.group?.subjects.some((s) => s.toLowerCase().includes(q)),
    );
  }, [displayGrades, searchQuery]);

  // Distinct academic years present in the data
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    yearSet.add(String(currentEthiopianYear));
    groups.forEach((g) => {
      if (g.academicYear) yearSet.add(g.academicYear);
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [groups, currentEthiopianYear]);

  // Batch initialize subjects for a grade
  const initializeSubjectsForGrade = async (gradeName: string) => {
    const predefined = GRADE_SUBJECTS[gradeName] || [];
    if (predefined.length === 0) {
      addToast(`No predefined subjects for ${gradeName}`, "info");
      return;
    }

    setBusyAction("init");
    setError(null);

    try {
      const response = await fetch("/api/subjects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: predefined.map((name) => ({
            name,
            grade: gradeName,
            gradeNumber: getGradeNumber(gradeName),
            academicYear,
          })),
        }),
      });

      const data = await response.json();

      if (data.summary) {
        const { created, exists, errors } = data.summary;
        if (errors > 0) {
          addToast(
            `Initialized ${created} subjects for ${gradeName} (${exists} already existed, ${errors} errors)`,
            "error",
          );
        } else if (created > 0) {
          addToast(
            `Successfully created ${created} subjects for ${gradeName}`,
            "success",
          );
        } else if (exists > 0) {
          addToast(
            `All ${exists} subjects already exist for ${gradeName}`,
            "info",
          );
        }
      }

      await loadSubjects();
    } catch (err) {
      addToast("Failed to initialize subjects", "error");
    } finally {
      setBusyAction(null);
    }
  };

  // Add a single custom subject
  const addSubject = async () => {
    if (!newSubject.trim() || !selectedGrade || !academicYear) {
      setError("Please fill in all fields");
      return;
    }

    setBusyAction("add");
    setError(null);

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubject.trim(),
          grade: selectedGrade,
          gradeNumber: getGradeNumber(selectedGrade),
          academicYear,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add subject");
      }

      await loadSubjects();
      setNewSubject("");
      addToast(`"${newSubject.trim()}" added to ${selectedGrade}`, "success");
      inputRef.current?.focus();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to add subject",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  };

  // Handle Enter key on subject input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject();
    }
  };

  // Remove a subject with confirmation
  const confirmRemoveSubject = (groupId: string, subjectName: string, gradeName: string) => {
    setConfirmDelete({ groupId, subjectName, gradeName });
  };

  const executeRemoveSubject = async () => {
    if (!confirmDelete) return;

    const { groupId, subjectName, gradeName } = confirmDelete;
    setConfirmDelete(null);
    setBusyAction("delete");

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
      addToast(`"${subjectName}" removed from ${gradeName}`, "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to remove subject",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  };

  // Count initialized vs uninitialized grades
  const stats = useMemo(() => {
    const total = ALL_GRADE_NAMES.length;
    const initialized = displayGrades.filter((g) => g.group && g.group.subjects.length > 0).length;
    const totalSubjects = displayGrades.reduce((sum, g) => sum + (g.group?.subjects.length || 0), 0);
    return { total, initialized, uninitialized: total - initialized, totalSubjects };
  }, [displayGrades]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Toast notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast, idx) => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-in slide-in-from-right-8 fade-in duration-300 flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : toast.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span className="shrink-0 mt-0.5">
              {toast.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : toast.type === "error" ? (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
            <p className="flex-1 text-sm font-semibold">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="rounded-3xl p-8 sm:p-12 shadow-2xl text-white transform hover:scale-[1.01] transition-transform duration-500 role-header-gradient">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-2">
              Subject Management
            </h2>
            <p className="text-blue-100/90 max-w-xl text-lg font-medium">
              Configure curriculum subjects mapped across all active grades.
              Initialize defaults or add custom subjects per grade.
            </p>
          </div>
        </div>
        {/* Stats row */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="bg-blue-400/30 p-2 rounded-xl">
              <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-blue-200/80 font-medium uppercase tracking-wider">Total Grades</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="bg-emerald-400/30 p-2 rounded-xl">
              <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.initialized}</p>
              <p className="text-xs text-emerald-200/80 font-medium uppercase tracking-wider">Initialized</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="bg-amber-400/30 p-2 rounded-xl">
              <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uninitialized}</p>
              <p className="text-xs text-amber-200/80 font-medium uppercase tracking-wider">Not Ready</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="bg-purple-400/30 p-2 rounded-xl">
              <svg className="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSubjects}</p>
              <p className="text-xs text-purple-200/80 font-medium uppercase tracking-wider">Total Subjects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Initialize Panel */}
        <div className="bg-white/80 backdrop-blur-xl border border-white p-6 sm:p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-xl font-bold role-text-gradient mb-5 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Initialize Default Set
          </h3>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">
                  Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-3.5 border-2 border-blue-100 bg-blue-50/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Grade</option>
                  {ALL_GRADE_NAMES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                      {GRADE_SUBJECTS[g] ? ` (${GRADE_SUBJECTS[g].length} subjects)` : " (No presets)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">
                  Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-3.5 border-2 border-blue-100 bg-blue-50/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Year</option>
                  {academicYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y} EC
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => selectedGrade && initializeSubjectsForGrade(selectedGrade)}
              disabled={!selectedGrade || !academicYear || busyAction === "init"}
              className="role-btn-primary w-full p-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {busyAction === "init" ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Initializing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Auto-Populate Subjects
                </>
              )}
            </button>
            {selectedGrade && GRADE_SUBJECTS[selectedGrade] && (
              <p className="text-xs text-gray-400 italic text-center">
                Will create <strong>{GRADE_SUBJECTS[selectedGrade].length}</strong> predefined subjects for {selectedGrade}
              </p>
            )}
          </div>
        </div>

        {/* Add Custom Panel */}
        <div className="bg-white/80 backdrop-blur-xl border border-white p-6 sm:p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300">
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-5 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Subject
          </h3>
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">
                Subject Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. የቤተክርስቲያን ሥርዓተ ትምህርት"
                className="w-full p-3.5 border-2 border-purple-100 bg-purple-50/50 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold text-gray-800 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">
                  Target Grade
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-3.5 border-2 border-purple-100 bg-purple-50/50 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Grade</option>
                  {ALL_GRADE_NAMES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">
                  Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-3.5 border-2 border-purple-100 bg-purple-50/50 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold text-gray-800 outline-none"
                >
                  <option value="">Select Year</option>
                  {academicYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y} EC
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={addSubject}
              disabled={!selectedGrade || !newSubject.trim() || !academicYear || busyAction === "add"}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold p-3.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {busyAction === "add" ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Subject
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 p-5 rounded-2xl flex items-start gap-3 shadow-md">
          <svg className="w-6 h-6 shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-bold text-sm uppercase tracking-wider">Error</p>
            <p className="text-red-600 font-medium mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Year Filter + Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Academic Year Selector for Roster */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest shrink-0">
            Year
          </label>
          <select
            value={rosterYear}
            onChange={(e) => setRosterYear(e.target.value)}
            className="p-3 border-2 border-gray-200 bg-white rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-gray-800 outline-none shadow-sm"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y} EC
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search grades or subjects..."
            className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 bg-white rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800 outline-none shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg p-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-400 font-medium hidden sm:block">
          {filteredGrades.length} / {displayGrades.length} grades in {rosterYear} EC
        </p>
      </div>

      {/* Roster View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 pb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-md border border-gray-100 animate-pulse">
              <div className="flex justify-between items-center mb-6">
                <div className="h-7 w-28 bg-gray-200 rounded-lg" />
                <div className="h-6 w-24 bg-gray-200 rounded-full" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-14 bg-gray-100 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-500 mb-2">
            {searchQuery ? "No matching grades found" : "No grades loaded"}
          </h3>
          <p className="text-gray-400">
            {searchQuery
              ? `Try a different search term for "${searchQuery}"`
              : "Select a grade and initialize subjects to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 pb-12">
          {filteredGrades.map((grade, gradeIdx) => {
            const isInitialized = Boolean(grade.group && grade.group.subjects.length > 0);
            const subjectCount = grade.group?.subjects.length || 0;
            const predefinedCount = GRADE_SUBJECTS[grade.name]?.length || 0;
            const progress = isInitialized ? 100 : 0;

            return (
              <div
                key={grade.name}
                className={`group bg-white rounded-[2rem] p-6 shadow-md border transition-all duration-500 hover:shadow-2xl ${
                  isInitialized
                    ? "border-gray-100 hover:border-blue-200"
                    : "border-dashed border-gray-300 hover:border-amber-300"
                }`}
                style={{
                  animation: `fadeInUp 0.5s ease-out ${gradeIdx * 0.06}s both`,
                }}
              >
                {/* Grade Header */}
                <div className="flex justify-between items-center mb-5">
                  <h3
                    className={`text-xl font-black drop-shadow-sm transition-colors ${
                      isInitialized
                        ? "text-gray-800 group-hover:text-blue-700"
                        : "text-gray-400"
                    }`}
                  >
                    {grade.name}
                  </h3>
                  <span
                    className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                      isInitialized
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isInitialized
                      ? `${subjectCount} Subjects`
                      : "Not Ready"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isInitialized
                        ? "bg-gradient-to-r from-blue-500 to-emerald-500"
                        : "bg-gray-300"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Subject List */}
                {!isInitialized ? (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 gap-3">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-400 font-semibold text-sm">No subjects yet</p>
                    <button
                      onClick={() => {
                        setSelectedGrade(grade.name);
                        initializeSubjectsForGrade(grade.name);
                      }}
                      disabled={busyAction === "init" || predefinedCount === 0}
                      className="text-xs bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {predefinedCount > 0 ? `Init with ${predefinedCount} defaults` : "Add manually above"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Subjects
                      </span>
                      <span className="text-xs text-gray-400">
                        {predefinedCount > 0 && subjectCount < predefinedCount
                          ? `${subjectCount}/${predefinedCount} preset`
                          : subjectCount === predefinedCount
                            ? "Full preset"
                            : `${subjectCount} total`}
                      </span>
                    </div>
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                      {grade.group!.subjects.map((subject, subIdx) => (
                        <div
                          key={subject}
                          className="flex justify-between items-center bg-gray-50/80 hover:bg-blue-50/50 p-3.5 rounded-xl border border-gray-100 group/subject transition-all duration-200"
                          style={{
                            animation: `fadeInUp 0.3s ease-out ${subIdx * 0.04}s both`,
                          }}
                        >
                          <div className="overflow-hidden pr-3 flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 truncate text-sm">
                              {subject}
                            </h4>
                            <p className="text-[11px] font-medium text-blue-500 mt-0.5">
                              {grade.group!.academicYear} EC
                            </p>
                          </div>
                          <button
                            onClick={() => confirmRemoveSubject(grade.group!._id, subject, grade.name)}
                            disabled={busyAction === "delete"}
                            className="shrink-0 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-2xl">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Remove Subject</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Are you sure you want to remove <strong className="text-gray-700">{confirmDelete.subjectName}</strong> from <strong className="text-gray-700">{confirmDelete.gradeName}</strong>?
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6 bg-gray-50 p-3 rounded-xl">
              This action cannot be undone. All associated data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeRemoveSubject}
                disabled={busyAction === "delete"}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busyAction === "delete" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
