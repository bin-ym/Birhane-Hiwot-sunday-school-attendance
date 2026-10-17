"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { toast, Toaster } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Users,
  Layers,
  Save,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import {
  GRADES,
  STUDENT_CLASSIFICATIONS,
  StudentClassification,
  CLASSIFICATION_SCHEDULE,
} from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { ScheduleSession, ScheduleStatus } from "@/lib/models";
import { EthiopianDatePicker } from "@/components/calendar/EthiopianDatePicker";

interface EnrichedSchedule extends Omit<ScheduleSession, "_id"> {
  _id: string;
  enrolledStudentsCount: number;
}

interface PeriodState {
  startDate: string;
  endDate: string;
  registrationClosedDate: string;
  isActive: boolean;
}

const createDefaultPeriod = (): PeriodState => ({
  startDate: "",
  endDate: "",
  registrationClosedDate: "",
  isActive: true,
});

const SEMESTERS = [
  "Semester 1 (መጀመሪያው መንፈቅ ዓመት)",
  "Semester 2 (ሁለተኛው መንፈቅ ዓመት)",
  "Summer (የክረምት)",
];

export default function SchedulerManagerPage() {
  const { user } = useAuth();
  const { canManageSchedules } = useRBAC();
  const currentYear = getCurrentEthiopianYear();

  const [activeTab, setActiveTab] = useState<"schedules" | "periods">("schedules");

  const handleChange = (
    classification: string,
    field: keyof PeriodState,
    value: string | boolean,
  ) => {
    setPeriods((prev) => ({
      ...prev,
      [classification]: {
        ...(prev[classification] || createDefaultPeriod()),
        [field]: value,
      },
    }));
  };

  // Determine authorized department for current user
  const userDepartment = useMemo(() => {
    if (user?.role === "Education Admin") return "Education";
    if (user?.role === "HR Admin") return "HR";
    return "Sunday School"; // Schedule Manager / Super Admin default
  }, [user]);

  // Schedules state
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Category Periods state
  const [periods, setPeriods] = useState<Record<string, PeriodState>>({});
  const [savingPeriods, setSavingPeriods] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EnrichedSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formSemester, setFormSemester] = useState(SEMESTERS[0]);
  const [formGrade, setFormGrade] = useState<string>(GRADES[0]);
  const [formSection, setFormSection] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSundayName, setFormSundayName] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:30");
  const [formEndTime, setFormEndTime] = useState("11:30");
  const [formStatus, setFormStatus] = useState<ScheduleStatus>("scheduled");
  const [formTopic, setFormTopic] = useState("");
  const [formTeacher, setFormTeacher] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchSchedules = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      params.set("academicYear", String(currentYear));
      params.set("department", userDepartment);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/v1/schedules?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      toast.error("Failed to load department schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch(`/api/v1/category-periods?academicYear=${currentYear}`);
      if (!res.ok) throw new Error("Failed to fetch category periods");
      const data = (await res.json()) as Array<{
        classification: StudentClassification;
        startDate?: string;
        endDate?: string;
        registrationClosedDate?: string;
        isActive?: boolean;
      }>;

      const periodMap: Record<string, PeriodState> = {};
      STUDENT_CLASSIFICATIONS.forEach((c) => {
        periodMap[c.value] = createDefaultPeriod();
      });

      data.forEach((p) => {
        if (!p || !p.classification) return;
        periodMap[p.classification] = {
          startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "",
          endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : "",
          registrationClosedDate: p.registrationClosedDate
            ? new Date(p.registrationClosedDate).toISOString().slice(0, 10)
            : "",
          isActive: p.isActive ?? true,
        };
      });
      setPeriods(periodMap);
    } catch {
      toast.error("Failed to load category periods");
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchPeriods();
  }, [userDepartment, gradeFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormSemester(SEMESTERS[0]);
    setFormGrade(GRADES[0]);
    setFormSection("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSundayName("");
    setFormStartTime("08:30");
    setFormEndTime("11:30");
    setFormStatus("scheduled");
    setFormTopic("");
    setFormTeacher("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (sch: EnrichedSchedule) => {
    setEditingSchedule(sch);
    setFormSemester(sch.semester);
    setFormGrade(sch.grade);
    setFormSection(sch.section || "");
    setFormDate(sch.date);
    setFormSundayName(sch.sundayName || "");
    setFormStartTime(sch.startTime);
    setFormEndTime(sch.endTime);
    setFormStatus(sch.status);
    setFormTopic(sch.topic || "");
    setFormTeacher(sch.assignedTeacherName || "");
    setFormNotes(sch.notes || "");
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEditing = Boolean(editingSchedule);
      const url = "/api/v1/schedules";
      const method = isEditing ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        academicYear: String(currentYear),
        semester: formSemester,
        department: userDepartment,
        grade: formGrade,
        section: formSection.trim() || undefined,
        date: formDate,
        sundayName: formSundayName.trim() || undefined,
        startTime: formStartTime,
        endTime: formEndTime,
        status: formStatus,
        topic: formTopic.trim() || undefined,
        assignedTeacherName: formTeacher.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (isEditing) {
        payload.id = editingSchedule!._id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save schedule session");

      toast.success(isEditing ? "Session updated" : "Session scheduled successfully");
      setIsModalOpen(false);
      setEditingSchedule(null);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePeriods = async () => {
    setSavingPeriods(true);
    try {
      const promises = Object.entries(periods).map(async ([classification, p]) => {
        if (!p.startDate || !p.endDate) return;
        return fetch("/api/v1/category-periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYear: String(currentYear),
            classification,
            startDate: p.startDate,
            endDate: p.endDate,
            registrationClosedDate: p.registrationClosedDate || p.endDate,
            isActive: p.isActive,
          }),
        });
      });
      await Promise.all(promises);
      toast.success("Category periods updated successfully");
    } catch {
      toast.error("Failed to save periods");
    } finally {
      setSavingPeriods(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (
        s.grade.toLowerCase().includes(term) ||
        (s.topic && s.topic.toLowerCase().includes(term)) ||
        (s.assignedTeacherName && s.assignedTeacherName.toLowerCase().includes(term)) ||
        s.date.includes(term)
      );
    });
  }, [schedules, searchTerm]);

  return (
    <div className="container-responsive py-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Scheduler Manager
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Department schedule management for <strong>{userDepartment}</strong> ({currentYear} E.C.)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSchedules()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {activeTab === "schedules" && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Schedule Session
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "schedules"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Department Class Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab("periods")}
            className={`pb-4 px-1 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "periods"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Layers className="h-4 w-4" />
            Category Registration Periods
          </button>
        </nav>
      </div>

      {/* TAB 1: SCHEDULES */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled (No Class)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Sunday</th>
                    <th className="py-3 px-4">Grade & Section</th>
                    <th className="py-3 px-4">Time Window</th>
                    <th className="py-3 px-4">Lesson Topic</th>
                    <th className="py-3 px-4">Assigned Teacher</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSchedules.map((sch) => (
                    <tr key={sch._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{sch.date}</div>
                        <div className="text-[11px] text-indigo-600">{sch.sundayName || "Sunday Class"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-800">
                        {sch.grade} {sch.section ? `(${sch.section})` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        {sch.startTime} - {sch.endTime}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-gray-800 font-medium">
                        {sch.topic || "Regular Curriculum Session"}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {sch.assignedTeacherName || "Unassigned"}
                      </td>
                      <td className="py-3.5 px-4">
                        {sch.status === "scheduled" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Scheduled
                          </span>
                        )}
                        {sch.status === "completed" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        )}
                        {sch.status === "cancelled" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Cancelled (No Class)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(sch)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSchedules.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-500">
                        No schedules found for this department. Click &ldquo;Schedule Session&rdquo; to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY REGISTRATION PERIODS */}
      {activeTab === "periods" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Registration Periods ({currentYear} E.C.)</h2>
              <p className="text-xs text-gray-500">Define registration opening, closing, and grace periods for student categories</p>
            </div>
            <button
              onClick={handleSavePeriods}
              disabled={savingPeriods}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingPeriods ? "Saving..." : "Save Periods"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STUDENT_CLASSIFICATIONS.map((c) => {
              const p = periods[c.value] || createDefaultPeriod();
              return (
                <div key={c.value} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{c.label} ({c.value})</span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) =>
                          setPeriods((prev) => ({
                            ...prev,
                            [c.value]: { ...p, isActive: e.target.checked },
                          }))
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Active
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 mb-4">
                    📅 Schedule: <span className="font-semibold text-gray-700">{CLASSIFICATION_SCHEDULE[c.value] || "Standard Weekend Schedule"}</span>
                  </p>

                  <div className="space-y-3">
                    <EthiopianDatePicker
                      label="Registration Open Date (ምዝገባ መክፈቻ)"
                      value={p.startDate}
                      onChange={(val) => handleChange(c.value, "startDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />

                    <EthiopianDatePicker
                      label="Registration Close Date (የመጨረሻ ማጠቃለያ)"
                      value={p.registrationClosedDate}
                      onChange={(val) => handleChange(c.value, "registrationClosedDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />

                    <EthiopianDatePicker
                      label="Period End Date (መደበኛ ማብቂያ)"
                      value={p.endDate}
                      onChange={(val) => handleChange(c.value, "endDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingSchedule ? "Edit Schedule Session" : "Schedule New Session"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Grade *</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Class / Section</label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Lesson Topic</label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. Genesis 1: The Creation"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Assigned Teacher</label>
                <input
                  type="text"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  placeholder="Teacher name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
