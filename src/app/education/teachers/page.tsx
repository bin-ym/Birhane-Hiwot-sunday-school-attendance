"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@/lib/models";
import { exportToExcel } from "@/lib/excelExport";
import { GRADE_OPTIONS, getGradeLabel } from "@/lib/constants";

interface Subject {
  _id?: string;
  name: string;
  grade: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected teacher for editing / assignment management
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);

  // Form states for creating a teacher
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: "",
    email: "",
    grade: GRADE_OPTIONS[0].value,
    assignedSubjects: [] as string[],
  });
  const [customSubjectInput, setCustomSubjectInput] = useState("");

  // Edit / Assignment states for selected teacher
  const [editGrade, setEditGrade] = useState<string>("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editSubjectInput, setEditSubjectInput] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // =========================================================
  // FETCH DATA
  // =========================================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTeachers, resSubjects] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/subjects"),
      ]);

      if (!resTeachers.ok) throw new Error("Failed to load teachers");
      const teachersData = await resTeachers.json();
      setTeachers(Array.isArray(teachersData) ? teachersData : []);

      if (resSubjects.ok) {
        const subjectsData = await resSubjects.json();
        setAvailableSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync selected teacher state with edit inputs
  useEffect(() => {
    if (selectedTeacher) {
      const rawGrade = selectedTeacher.grade;
      const currentGrade = Array.isArray(rawGrade)
        ? rawGrade[0] || ""
        : rawGrade || "";
      setEditGrade(currentGrade);
      setEditSubjects(selectedTeacher.assignedSubjects || []);
      setSaveSuccessMsg(null);
    }
  }, [selectedTeacher]);

  // =========================================================
  // HANDLERS FOR NEW TEACHER FORM
  // =========================================================
  const handleAddSubjectToNewForm = (subj: string) => {
    const trimmed = subj.trim();
    if (!trimmed) return;
    if (!newTeacherForm.assignedSubjects.includes(trimmed)) {
      setNewTeacherForm((prev) => ({
        ...prev,
        assignedSubjects: [...prev.assignedSubjects, trimmed],
      }));
    }
    setCustomSubjectInput("");
  };

  const handleRemoveSubjectFromNewForm = (subj: string) => {
    setNewTeacherForm((prev) => ({
      ...prev,
      assignedSubjects: prev.assignedSubjects.filter((s) => s !== subj),
    }));
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeacherForm.name,
          email: newTeacherForm.email,
          grade: newTeacherForm.grade,
          assignedSubjects: newTeacherForm.assignedSubjects,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create teacher");
      }

      setShowAddForm(false);
      setNewTeacherForm({
        name: "",
        email: "",
        grade: GRADE_OPTIONS[0].value,
        assignedSubjects: [],
      });
      await fetchData();
    } catch (err: any) {
      console.error("Failed to create teacher:", err);
      alert(err.message || "Error adding teacher");
    }
  };

  // =========================================================
  // HANDLERS FOR SELECTED TEACHER MANAGEMENT
  // =========================================================
  const handleAddSubjectToEdit = (subj: string) => {
    const trimmed = subj.trim();
    if (!trimmed) return;
    if (!editSubjects.includes(trimmed)) {
      setEditSubjects((prev) => [...prev, trimmed]);
    }
    setEditSubjectInput("");
  };

  const handleRemoveSubjectFromEdit = (subj: string) => {
    setEditSubjects((prev) => prev.filter((s) => s !== subj));
  };

  const handleSaveAssignments = async () => {
    if (!selectedTeacher || !selectedTeacher._id) return;
    setSavingAssignment(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTeacher._id.toString(),
          name: selectedTeacher.name,
          email: selectedTeacher.email,
          grade: editGrade,
          assignedSubjects: editSubjects,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update assignments");
      }

      setSaveSuccessMsg("Grade and Subject assignments updated successfully!");
      await fetchData();
      setSelectedTeacher((prev) =>
        prev
          ? {
              ...prev,
              grade: editGrade,
              assignedSubjects: editSubjects,
            }
          : null,
      );
    } catch (err: any) {
      console.error("Failed to save assignments:", err);
      alert(err.message || "Failed to update teacher assignments");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher account?"))
      return;
    try {
      const res = await fetch("/api/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to delete teacher");

      setSelectedTeacher(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete teacher:", err);
      alert("Failed to delete teacher");
    }
  };

  // Get subjects suggested for the currently selected grade in forms
  const filterSubjectsByGrade = (gradeVal: string) => {
    return availableSubjects
      .filter((s) => s.grade === gradeVal)
      .map((s) => s.name);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="flex flex-col gap-5 p-6 sm:p-8 rounded-3xl shadow-xl text-white role-header-gradient lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Teachers Management
          </h1>
          <p className="text-white/80 font-medium mt-2 max-w-xl text-sm sm:text-base">
            Create teacher accounts, assign grades and subjects, and manage
            teacher profiles.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => exportToExcel(teachers, "Teachers_Directory")}
            disabled={teachers.length === 0}
            className="rounded-xl bg-white/10 backdrop-blur px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Directory
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 role-btn-primary"
          >
            {showAddForm ? "Cancel Add" : "+ New Teacher"}
          </button>
        </div>
      </div>

      {/* =========================================================
          CREATE TEACHER FORM
      ========================================================= */}
      {showAddForm && (
        <form
          onSubmit={handleCreateTeacher}
          className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-emerald-100 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold role-text-gradient">
              Create New Teacher Account
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter teacher details and assign their grade and teaching
              subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-gray-700 text-sm">
                Full Name *
              </span>
              <input
                required
                type="text"
                className="p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.name}
                onChange={(e) =>
                  setNewTeacherForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Abebe Bikila"
              />
            </label>

            {/* Email */}
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-gray-700 text-sm">
                Email Address *
              </span>
              <input
                required
                type="email"
                className="p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.email}
                onChange={(e) =>
                  setNewTeacherForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="teacher@school.com"
              />
            </label>

            {/* Grade Assignment */}
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-semibold text-gray-700 text-sm">
                Assigned Grade *
              </span>
              <select
                className="p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.grade}
                onChange={(e) =>
                  setNewTeacherForm((prev) => ({
                    ...prev,
                    grade: e.target.value,
                  }))
                }
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Subjects Assignment */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-semibold text-gray-700 text-sm">
                Assign Teaching Subjects
              </span>

              {/* Suggested grade subjects */}
              {filterSubjectsByGrade(newTeacherForm.grade).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    Curriculum subjects:
                  </span>
                  {filterSubjectsByGrade(newTeacherForm.grade).map(
                    (subName) => (
                      <button
                        key={subName}
                        type="button"
                        onClick={() => handleAddSubjectToNewForm(subName)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          newTeacherForm.assignedSubjects.includes(subName)
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        + {subName}
                      </button>
                    ),
                  )}
                </div>
              )}

              {/* Add Custom Subject Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  placeholder="Add custom subject name..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubjectToNewForm(customSubjectInput);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddSubjectToNewForm(customSubjectInput)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition"
                >
                  Add Subject
                </button>
              </div>

              {/* Assigned Subjects Badges */}
              <div className="flex flex-wrap gap-2 mt-2 min-h-[36px] p-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                {newTeacherForm.assignedSubjects.length === 0 ? (
                  <span className="text-xs text-gray-400 self-center px-1">
                    No subjects assigned yet. Select or type above.
                  </span>
                ) : (
                  newTeacherForm.assignedSubjects.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectFromNewForm(sub)}
                        className="text-purple-600 hover:text-purple-950 font-black text-sm"
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full font-bold text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all role-btn-primary"
          >
            Create Teacher Account
          </button>
        </form>
      )}

      {/* =========================================================
          TEACHER LIST & MANAGEMENT GRID
      ========================================================= */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border-2 border-dashed border-red-200 text-center font-semibold">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* TEACHER CARDS LIST */}
          <div
            className={[
              "col-span-1 min-w-0 space-y-4 transition-all duration-500",
              selectedTeacher ? "lg:col-span-7" : "lg:col-span-12",
            ].join(" ")}
          >
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-black">
                {teachers.length}
              </span>
              Active Teachers
            </h3>

            <div
              className={[
                "grid grid-cols-1 gap-4",
                selectedTeacher
                  ? "sm:grid-cols-2 lg:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3",
              ].join(" ")}
            >
              {teachers.map((teacher) => {
                const isSelected =
                  selectedTeacher?._id?.toString() === teacher._id?.toString();
                const rawGrade = teacher.grade;
                const gradeStr = Array.isArray(rawGrade)
                  ? rawGrade[0]
                  : rawGrade;
                const displayGrade = gradeStr
                  ? getGradeLabel(gradeStr)
                  : "No Grade Assigned";

                return (
                  <div
                    key={teacher._id?.toString()}
                    onClick={() => setSelectedTeacher(teacher)}
                    className={[
                      "group relative cursor-pointer overflow-hidden rounded-2xl p-5",
                      "transition-all duration-300 border min-w-0",
                      isSelected
                        ? "bg-gradient-to-br from-emerald-50/90 to-teal-50/80 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1",
                    ].join(" ")}
                  >
                    {/* Top Accent */}
                    <div
                      className={[
                        "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
                        isSelected
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : "bg-gradient-to-r from-gray-200 to-gray-100 group-hover:from-emerald-400 group-hover:to-teal-400",
                      ].join(" ")}
                    />

                    {/* Teacher Profile Header */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        {teacher.name
                          ? teacher.name.charAt(0).toUpperCase()
                          : "T"}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-extrabold text-gray-900 text-base truncate group-hover:text-emerald-700 transition-colors"
                          title={teacher.name || ""}
                        >
                          {teacher.name || "Unnamed Teacher"}
                        </h4>
                        <p
                          className="text-xs font-medium text-gray-500 truncate mt-0.5"
                          title={teacher.email || ""}
                        >
                          {teacher.email}
                        </p>
                        <span className="inline-block max-w-full truncate mt-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          Teacher
                        </span>
                      </div>
                    </div>

                    {/* Assignments */}
                    <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl max-w-full">
                        <svg
                          className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="truncate">{displayGrade}</span>
                      </div>

                      {teacher.assignedSubjects &&
                      teacher.assignedSubjects.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl">
                          <svg
                            className="w-3.5 h-3.5 text-purple-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          <span>
                            {teacher.assignedSubjects.length} Subject(s)
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Footer Status Bar */}
                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-dashed border-gray-100">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active Staff
                      </span>
                      <span className="text-gray-400 group-hover:text-emerald-600 transition-colors font-medium flex items-center gap-0.5">
                        Manage &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {teachers.length === 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-emerald-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="font-medium">No teachers found.</p>
              </div>
            )}
          </div>

          {/* =====================================================
              SELECTED TEACHER MANAGEMENT PANEL
          ===================================================== */}
          {selectedTeacher && (
            <div className="col-span-1 lg:col-span-5 min-w-0 bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-200 sticky top-24 animate-in slide-in-from-right-8 duration-300 space-y-6">
              {/* Panel Header */}
              <div className="flex justify-between items-start gap-4 border-b border-gray-100 pb-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold text-gray-900 truncate">
                    {selectedTeacher.name}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 truncate">
                    {selectedTeacher.email}
                  </p>
                  <span className="inline-block mt-2 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                    Teacher Account
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="shrink-0 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
                  aria-label="Close panel"
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

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl animate-in fade-in">
                  ✓ {saveSuccessMsg}
                </div>
              )}

              {/* ASSIGN GRADE SECTION */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-800">
                  Assigned Grade
                </label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                >
                  <option value="">-- No Grade Assigned --</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ASSIGN SUBJECTS SECTION */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-800">
                  Assigned Teaching Subjects
                </label>

                {/* Suggested Subjects */}
                {editGrade && filterSubjectsByGrade(editGrade).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-gray-500">
                      Curriculum subjects:
                    </span>
                    {filterSubjectsByGrade(editGrade).map((subName) => (
                      <button
                        key={subName}
                        type="button"
                        onClick={() => handleAddSubjectToEdit(subName)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          editSubjects.includes(subName)
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        + {subName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom subject input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm outline-none"
                    value={editSubjectInput}
                    onChange={(e) => setEditSubjectInput(e.target.value)}
                    placeholder="Add custom subject..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubjectToEdit(editSubjectInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubjectToEdit(editSubjectInput)}
                    className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs"
                  >
                    Add
                  </button>
                </div>

                {/* Subject pills */}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl min-h-[44px]">
                  {editSubjects.length === 0 ? (
                    <span className="text-xs text-gray-400 self-center">
                      No subjects assigned.
                    </span>
                  ) : (
                    editSubjects.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectFromEdit(sub)}
                          className="text-purple-600 hover:text-purple-950 font-black"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* SAVE ASSIGNMENTS BUTTON */}
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={savingAssignment}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:bg-gray-300"
              >
                {savingAssignment
                  ? "Saving Changes..."
                  : "Save Grade & Subject Assignments"}
              </button>

              {/* ACCOUNT ACTIONS */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteTeacher(selectedTeacher._id!.toString())
                  }
                  className="w-full py-3 px-4 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition border border-red-100"
                >
                  Delete Teacher Account
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
