"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { User, Subject } from "@/lib/models";
import { exportToExcel } from "@/lib/excelExport";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection / Editing State
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [editGrade, setEditGrade] = useState<string>("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);

  // Add new teacher state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTeachers, resSubjects] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/subjects"),
      ]);

      if (!resTeachers.ok) throw new Error("Failed to load teachers");
      const data = await resTeachers.json();
      setTeachers(Array.isArray(data) ? data : []);

      if (resSubjects.ok) {
        const subData = await resSubjects.json();
        setSubjectsList(Array.isArray(subData) ? subData : []);
      }

      setError(null);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueGrades = useMemo(() => {
    const grades = new Set(subjectsList.map((s) => s.grade));
    return Array.from(grades).sort();
  }, [subjectsList]);

  const subjectsForSelectedGrade = useMemo(() => {
    if (!editGrade) return [];
    return subjectsList.filter((s) => s.grade === editGrade).map((s) => s.name);
  }, [subjectsList, editGrade]);

  const handleEditClick = (t: User) => {
    setSelectedTeacher(t);
    setEditGrade(t.grade ? String(t.grade) : "");
    setEditSubjects(t.assignedSubjects || []);
  };

  const handleSubjectToggle = (subjName: string) => {
    setEditSubjects((prev) =>
      prev.includes(subjName)
        ? prev.filter((s) => s !== subjName)
        : [...prev, subjName],
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedTeacher) return;
    try {
      const res = await fetch("/api/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTeacher._id,
          name: selectedTeacher.name,
          email: selectedTeacher.email,
          grade: editGrade || null,
          assignedSubjects: editSubjects,
        }),
      });
      if (!res.ok) throw new Error("Failed to update teacher");
      await fetchData();
      setSelectedTeacher(null);
    } catch (err) {
      alert("Error saving assignments");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;
    try {
      const res = await fetch("/api/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete teacher");
      fetchData();
    } catch (err) {
      alert("Failed to delete teacher");
    }
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
          password: newTeacherForm.password,
          grade: null,
          assignedSubjects: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed context");
      }
      setShowAddForm(false);
      setNewTeacherForm({ name: "", email: "", password: "" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error adding teacher");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900 p-8 rounded-3xl shadow-xl text-white">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Teachers Roster
          </h1>
          <p className="text-emerald-100/90 font-medium mt-2 max-w-xl">
            Manage teacher accounts. Review personnel details and assign Grade
            and Subject coverages across your departments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportToExcel(teachers, "Teachers_Directory")}
            className="rounded-xl bg-white/10 backdrop-blur px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            disabled={teachers.length === 0}
          >
            Export Directory
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-xl bg-emerald-500 shadow-emerald-500/30 px-5 py-3 text-sm font-bold text-white shadow-xl transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            {showAddForm ? "Cancel Add" : "+ New Teacher"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateTeacher}
          className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 max-w-3xl mx-auto space-y-6"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Create Teacher Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-gray-700">Full Name</span>
              <input
                required
                type="text"
                className="p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.name}
                onChange={(e) =>
                  setNewTeacherForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="John Doe"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-gray-700">Email Address</span>
              <input
                required
                type="email"
                className="p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.email}
                onChange={(e) =>
                  setNewTeacherForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="teacher@school.com"
              />
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-semibold text-gray-700">
                Temporary Password
              </span>
              <input
                required
                type="password"
                minLength={6}
                className="p-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={newTeacherForm.password}
                onChange={(e) =>
                  setNewTeacherForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Minimum 6 characters"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            Register Teacher
          </button>
        </form>
      )}

      {/* Main Layout: List & details grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border-2 border-dashed border-red-200 text-center font-semibold">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* List Column */}
          <div
            className={`col-span-1 lg:col-span-${selectedTeacher ? "7" : "12"} space-y-4 transition-all duration-500`}
          >
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-black">
                {teachers.length}
              </span>
              Active Teachers
            </h3>

            <div
              className={`grid grid-cols-1 ${selectedTeacher ? "md:grid-cols-1 lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}
            >
              {teachers.map((t) => (
                <div
                  key={t._id?.toString()}
                  onClick={() => handleEditClick(t)}
                  className={`cursor-pointer overflow-hidden p-6 rounded-3xl shadow-sm border transition-all duration-300 transform hover:-translate-y-1 ${selectedTeacher?._id === t._id ? "border-emerald-500 shadow-md shadow-emerald-500/20 bg-emerald-50/30" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4
                        className="font-bold text-lg text-gray-900 truncate pr-2"
                        title={t.name}
                      >
                        {t.name || "Unnamed Teacher"}
                      </h4>
                      <p
                        className="text-sm text-gray-500 mt-1 truncate"
                        title={t.email}
                      >
                        {t.email}
                      </p>
                    </div>
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold uppercase overflow-hidden">
                      {t.name ? t.name.charAt(0) : "T"}
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-100/80 flex items-center gap-2 flex-wrap">
                    {t.grade ? (
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                        {Array.isArray(t.grade) ? t.grade.join(", ") : t.grade}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full">
                        No Grade Assigned
                      </span>
                    )}

                    {t.assignedSubjects && t.assignedSubjects.length > 0 && (
                      <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full">
                        {t.assignedSubjects.length} Subjects
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="font-medium">No teachers found.</p>
              </div>
            )}
          </div>

          {/* Details / Assignment Column */}
          {selectedTeacher && (
            <div className="col-span-1 lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-100 sticky top-24 animate-in slide-in-from-right-8 duration-300">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    {selectedTeacher.name}
                  </h2>
                  <p className="text-gray-500 mt-1">{selectedTeacher.email}</p>
                </div>
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
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

              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 rounded-2xl">
                  <label className="block text-sm font-bold text-teal-800 mb-3">
                    Assign to Grade
                  </label>
                  <select
                    value={editGrade}
                    onChange={(e) => {
                      setEditGrade(e.target.value);
                      setEditSubjects([]); // Reset subjects if grade changes
                    }}
                    className="w-full p-3 border-0 ring-1 ring-emerald-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium shadow-sm transition-all outline-none"
                  >
                    <option value="">-- No Grade --</option>
                    {uniqueGrades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    Assign Subjects
                  </label>
                  {editGrade ? (
                    subjectsForSelectedGrade.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {subjectsForSelectedGrade.map((subj) => {
                          const isSelected = editSubjects.includes(subj);
                          return (
                            <label
                              key={subj}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                            >
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500" : "bg-white border-gray-300"}`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3.5 h-3.5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="3"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span
                                className={`font-semibold ${isSelected ? "text-indigo-900" : "text-gray-700"}`}
                              >
                                {subj}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-2">
                        No predefined subjects found for {editGrade}. Request an
                        admin to initialize subjects for this grade.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-gray-500 italic py-2">
                      Select a grade first to assign subjects.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-gray-100">
                <button
                  onClick={() => handleDelete(selectedTeacher._id!.toString())}
                  className="px-4 py-2 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete Account
                </button>
                <button
                  onClick={handleSaveAssignment}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
