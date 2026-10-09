"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { GRADE_OPTIONS, GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear, getAcademicYearLifecycle } from "@/lib/utils";
import type { ClassSession, ClassSessionDay, ClassSessionPeriod } from "@/lib/models";

const DAYS_OF_WEEK: { value: ClassSessionDay; label: string; amharic: string }[] = [
  { value: "Saturday", label: "Saturday", amharic: "ቅዳሜ" },
  { value: "Sunday", label: "Sunday", amharic: "እሁድ" },
  { value: "Monday", label: "Monday", amharic: "ሰኞ" },
  { value: "Tuesday", label: "Tuesday", amharic: "ማክሰኞ" },
  { value: "Wednesday", label: "Wednesday", amharic: "ረቡዕ" },
  { value: "Thursday", label: "Thursday", amharic: "ሐሙስ" },
  { value: "Friday", label: "Friday", amharic: "ዓርብ" },
];

const SESSIONS: { value: ClassSessionPeriod; label: string; amharic: string }[] = [
  { value: "Morning", label: "Morning", amharic: "ጠዋት" },
  { value: "Afternoon", label: "Afternoon", amharic: "ከሰዓት" },
  { value: "Evening", label: "Evening", amharic: "ማታ" },
];

interface FormState {
  _id?: string;
  name: string;
  nameAmharic: string;
  dayOfWeek: ClassSessionDay;
  session: ClassSessionPeriod;
  startTime: string;
  endTime: string;
  grades: string[];
  capacity: string;
  description: string;
  isActive: boolean;
}

const initialForm: FormState = {
  name: "",
  nameAmharic: "",
  dayOfWeek: "Sunday",
  session: "Morning",
  startTime: "08:00",
  endTime: "11:30",
  grades: [],
  capacity: "",
  description: "",
  isActive: true,
};

export function ClassSessionsSettingsTab() {
  const currentEthiopianYear = getCurrentEthiopianYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentEthiopianYear);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const academicYears = useMemo(() => {
    return [
      currentEthiopianYear - 2,
      currentEthiopianYear - 1,
      currentEthiopianYear,
      currentEthiopianYear + 1,
    ];
  }, [currentEthiopianYear]);

  const lifecycle = useMemo(() => {
    return getAcademicYearLifecycle(selectedYear);
  }, [selectedYear]);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/class-sessions?academicYear=${selectedYear}&activeOnly=false&includeStats=true`);
      if (!res.ok) throw new Error("Failed to load classes");
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load class sessions");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      name: "",
      nameAmharic: "",
      dayOfWeek: "Sunday",
      session: "Morning",
      grades: [],
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: ClassSession) => {
    setEditingId(c._id ? c._id.toString() : null);
    setFormData({
      _id: c._id ? c._id.toString() : undefined,
      name: c.name,
      nameAmharic: c.nameAmharic,
      dayOfWeek: c.dayOfWeek,
      session: c.session,
      startTime: c.startTime || "",
      endTime: c.endTime || "",
      grades: c.grades || [],
      capacity: c.capacity ? String(c.capacity) : "",
      description: c.description || "",
      isActive: c.isActive ?? true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleToggleGrade = (gradeValue: string) => {
    setFormData((prev) => {
      const exists = prev.grades.includes(gradeValue);
      return {
        ...prev,
        grades: exists
          ? prev.grades.filter((g) => g !== gradeValue)
          : [...prev.grades, gradeValue],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nameAmharic.trim()) {
      setFormError("English and Amharic class names are required");
      return;
    }
    if (formData.grades.length === 0) {
      setFormError("Select at least one grade offered in this class session");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        academicYear: String(selectedYear),
        name: formData.name.trim(),
        nameAmharic: formData.nameAmharic.trim(),
        dayOfWeek: formData.dayOfWeek,
        session: formData.session,
        startTime: formData.startTime.trim() || undefined,
        endTime: formData.endTime.trim() || undefined,
        grades: formData.grades,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      const url = "/api/class-sessions";
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...payload, _id: editingId } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save class session");
      }

      toast.success(editingId ? "✅ Class session updated" : "✅ Class session created");
      setShowModal(false);
      await fetchClasses();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete class session "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/class-sessions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete class session");
      }
      toast.success("✅ Class session deleted");
      await fetchClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete class session");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Academic Year Selector Strip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Class / Session Architecture (የክፍለ-ጊዜ መርሃ-ግብር)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure liturgical classes, session meeting days (Saturday vs Sunday), times, and assigned grades for each academic year.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            Academic Year:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-sm font-semibold border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            {academicYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr} ዓ.ም. {yr === currentEthiopianYear ? "(Current)" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* ─── Lifecycle Badge ─── */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
          lifecycle.status === "current"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : lifecycle.status === "past"
            ? "bg-gray-100 border-gray-300 text-gray-700"
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider">{lifecycle.label}</span>
          <span>·</span>
          <span>
            {lifecycle.status === "current"
              ? "Current active school year — modifications directly impact active student groups"
              : lifecycle.status === "past"
              ? "Past academic year — archived configurations preserved for historical audit"
              : "Upcoming academic year — advance setup for next cohort"}
          </span>
        </div>
        <span className="text-[11px] font-semibold opacity-80">
          Academic Year {selectedYear} EC
        </span>
      </div>

      {/* ─── Classes View (Table & Cards) ─── */}
      {loading ? (
        <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-2xl border">
          Loading class sessions for {selectedYear} ዓ.ም....
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-2xl border">
          No class sessions configured for {selectedYear} ዓ.ም.. Click &quot;Add Class&quot; to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Canonical Table View (Requirement 8 & 9) */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Class / Session Architecture Table ({selectedYear} ዓ.ም.)
                </h3>
                <p className="text-xs text-gray-500">
                  Cohorts, liturgical meeting days, assigned grade ranges, and capacity limits.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                {classes.length} Sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Class / Session</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Grades</th>
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Capacity / Enrolled</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classes.map((c) => {
                    const isSat = c.dayOfWeek === "Saturday";
                    const enrolled = c.enrolledCount ?? 0;
                    const hasCapacity = typeof c.capacity === "number" && c.capacity > 0;
                    const isFull = hasCapacity && enrolled >= (c.capacity as number);

                    const gradesList = c.grades || [];
                    const hasGrade7 = gradesList.some(
                      (g) => g.includes("7") || g.includes("ሰባተኛ")
                    );

                    return (
                      <tr
                        key={c._id ? c._id.toString() : c.name}
                        className="hover:bg-gray-50/70 transition"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-black text-gray-900">{c.nameAmharic}</div>
                          <div className="text-xs text-gray-500 font-medium">{c.name}</div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                              isSat
                                ? "bg-amber-50 text-amber-900 border border-amber-200"
                                : "bg-indigo-50 text-indigo-900 border border-indigo-200"
                            }`}
                          >
                            {isSat ? "Saturday (ቅዳሜ)" : "Sunday (እሁድ)"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-gray-800">
                            {c.session === "Morning" ? "Morning" : c.session === "Afternoon" ? "Afternoon" : "Evening"}
                          </div>
                          {(c.startTime || c.endTime) && (
                            <div className="text-[11px] text-gray-500 font-mono">
                              {c.startTime || "—"}–{c.endTime || "—"}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {gradesList.map((g) => {
                              const isThisG7 = g.includes("7") || g.includes("ሰባተኛ");
                              return (
                                <span
                                  key={g}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isThisG7
                                      ? "bg-purple-100 text-purple-900 border-purple-300 ring-1 ring-purple-300"
                                      : "bg-gray-100 text-gray-800 border-gray-200"
                                  }`}
                                  title={isThisG7 ? "Grade 7 is explicitly linked to this session" : undefined}
                                >
                                  {g}
                                </span>
                              );
                            })}
                            {hasGrade7 && (
                              <span className="text-[9px] font-black text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 ml-1">
                                Grade 7 Visible
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-gray-700">
                          {c.academicYear}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {hasCapacity ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span className={isFull ? "text-red-700 font-black" : "text-gray-900"}>
                                  {enrolled} / {c.capacity}
                                </span>
                                {isFull && (
                                  <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                                    Full
                                  </span>
                                )}
                              </div>
                              <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isFull ? "bg-red-600" : "bg-indigo-600"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.round((enrolled / (c.capacity as number)) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">
                              Enrolled: {enrolled}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isFull ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-800 border border-red-200">
                              Full
                            </span>
                          ) : c.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                            {c._id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(c._id!.toString(), c.nameAmharic || c.name)}
                                className="inline-flex items-center p-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Delete session"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal / Form for Add/Edit ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Class Session" : "Create New Class Session"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amharic Name (ስም በአማርኛ) *
                  </label>
                  <input
                    type="text"
                    value={formData.nameAmharic}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nameAmharic: e.target.value }))
                    }
                    placeholder="e.g. ከሰዓት ህጻናት"
                    required
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    English Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Saturday Afternoon Children"
                    required
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meeting Day (ቀን) *
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        dayOfWeek: e.target.value as ClassSessionDay,
                      }))
                    }
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.amharic} ({d.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Session (ክፍለ-ጊዜ) *
                  </label>
                  <select
                    value={formData.session}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        session: e.target.value as ClassSessionPeriod,
                      }))
                    }
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {SESSIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.amharic} ({s.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, isActive: e.target.value === "true" }))
                    }
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, startTime: e.target.value }))
                    }
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, endTime: e.target.value }))
                    }
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Capacity (የተማሪዎች ገደብ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, capacity: e.target.value }))
                    }
                    placeholder="e.g. 30 (Leave blank for no limit)"
                    className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Grades Assignment Multi-Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800">
                    Assigned Grades (የሚካተቱ ክፍሎች) *
                  </label>
                  <span className="text-[11px] text-gray-500">
                    {formData.grades.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl max-h-48 overflow-y-auto">
                  {GRADE_OPTIONS.map((opt) => {
                    const isChecked = formData.grades.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer transition border ${
                          isChecked
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold"
                            : "bg-white border-gray-200/80 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGrade(opt.value)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Additional notes about this class or student group..."
                  className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs disabled:opacity-50 transition"
                >
                  {saving ? "Saving..." : editingId ? "Update Class" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
