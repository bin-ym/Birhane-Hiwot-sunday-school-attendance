"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { toast, Toaster } from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CalendarDays,
  ListFilter,
  Info,
} from "lucide-react";
import { GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { ScheduleSession, ScheduleStatus } from "@/lib/models";

interface EnrichedSchedule extends Omit<ScheduleSession, "_id"> {
  _id: string;
  enrolledStudentsCount: number;
}

const DEPARTMENTS = ["Sunday School", "Education", "HR", "Youth", "Children"];
const SEMESTERS = ["Semester 1 (መጀመሪያው መንፈቅ ዓመት)", "Semester 2 (ሁለተኛው መንፈቅ ዓመት)", "Summer (የክረምት)"];

export default function SuperAdminSchedulePage() {
  const { user } = useAuth();
  const currentYear = getCurrentEthiopianYear();

  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state: 'list' | 'timeline'
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  // Filters
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [semesterFilter, setSemesterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EnrichedSchedule | null>(null);
  const [cancellingSchedule, setCancellingSchedule] = useState<EnrichedSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<EnrichedSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formYear, setFormYear] = useState(String(currentYear));
  const [formSemester, setFormSemester] = useState(SEMESTERS[0]);
  const [formDepartment, setFormDepartment] = useState("Sunday School");
  const [formGrade, setFormGrade] = useState<string>(GRADES[0]);
  const [formSection, setFormSection] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSundayNumber, setFormSundayNumber] = useState<number | "">("");
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
      if (yearFilter) params.set("academicYear", yearFilter);
      if (semesterFilter) params.set("semester", semesterFilter);
      if (departmentFilter) params.set("department", departmentFilter);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/v1/schedules?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [yearFilter, semesterFilter, departmentFilter, gradeFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormYear(String(currentYear));
    setFormSemester(SEMESTERS[0]);
    setFormDepartment("Sunday School");
    setFormGrade(GRADES[0]);
    setFormSection("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSundayNumber("");
    setFormSundayName("");
    setFormStartTime("08:30");
    setFormEndTime("11:30");
    setFormStatus("scheduled");
    setFormTopic("");
    setFormTeacher("");
    setFormNotes("");
    setIsCreateOpen(true);
  };

  const openEditModal = (sch: EnrichedSchedule) => {
    setEditingSchedule(sch);
    setFormYear(sch.academicYear);
    setFormSemester(sch.semester);
    setFormDepartment(sch.department);
    setFormGrade(sch.grade);
    setFormSection(sch.section || "");
    setFormDate(sch.date);
    setFormSundayNumber(sch.sundayNumber || "");
    setFormSundayName(sch.sundayName || "");
    setFormStartTime(sch.startTime);
    setFormEndTime(sch.endTime);
    setFormStatus(sch.status);
    setFormTopic(sch.topic || "");
    setFormTeacher(sch.assignedTeacherName || "");
    setFormNotes(sch.notes || "");
    setIsCreateOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEditing = Boolean(editingSchedule);
      const url = "/api/v1/schedules";
      const method = isEditing ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        academicYear: formYear,
        semester: formSemester,
        department: formDepartment,
        grade: formGrade,
        section: formSection.trim() || undefined,
        date: formDate,
        sundayNumber: formSundayNumber ? Number(formSundayNumber) : undefined,
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to save schedule session");
      }

      toast.success(isEditing ? "Schedule session updated" : "Schedule session created");
      setIsCreateOpen(false);
      setEditingSchedule(null);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCancel = async (sch: EnrichedSchedule) => {
    const nextStatus = sch.status === "cancelled" ? "scheduled" : "cancelled";
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sch._id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");
      toast.success(nextStatus === "cancelled" ? "Session marked as Cancelled (No Class)" : "Session restored to Scheduled");
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingSchedule._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete schedule");
      toast.success("Schedule session deleted");
      setDeletingSchedule(null);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (
        s.grade.toLowerCase().includes(term) ||
        (s.topic && s.topic.toLowerCase().includes(term)) ||
        (s.assignedTeacherName && s.assignedTeacherName.toLowerCase().includes(term)) ||
        s.date.includes(term) ||
        (s.sundayName && s.sundayName.toLowerCase().includes(term))
      );
    });
  }, [schedules, searchTerm]);

  // Summary counts
  const totalScheduled = schedules.filter((s) => s.status === "scheduled").length;
  const totalCompleted = schedules.filter((s) => s.status === "completed").length;
  const totalCancelled = schedules.filter((s) => s.status === "cancelled").length;

  return (
    <div className="container-responsive py-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Schedule Control
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Global scheduling calendar, session conflict detection, and attendance linkage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSchedules()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Class Session
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sessions</p>
            <p className="text-2xl font-black text-gray-900">{schedules.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Active</p>
            <p className="text-2xl font-black text-gray-900">{totalScheduled}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-gray-900">{totalCompleted}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancelled / No Class</p>
            <p className="text-2xl font-black text-gray-900">{totalCancelled}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search topic, teacher, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            <option value="2018">2018 E.C.</option>
            <option value="2017">2017 E.C.</option>
            <option value="2016">2016 E.C.</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

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

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Roster Table
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "timeline" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sunday Timeline
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE */}
      {viewMode === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date & Sunday</th>
                  <th className="py-3.5 px-4">Grade / Section</th>
                  <th className="py-3.5 px-4">Time Slot</th>
                  <th className="py-3.5 px-4">Topic & Teacher</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Enrolled Students</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSchedules.map((sch) => (
                  <tr key={sch._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-black text-gray-900">{sch.date}</div>
                      <div className="text-[11px] text-indigo-600 font-semibold">
                        {sch.sundayName || (sch.sundayNumber ? `Sunday ${sch.sundayNumber}` : "Sunday Class")}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-800">
                        {sch.grade}
                      </span>
                      {sch.section && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                          {sch.section}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-gray-700">
                      {sch.startTime} - {sch.endTime}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-gray-900 truncate">
                        {sch.topic || "Regular Curriculum Session"}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        Teacher: {sch.assignedTeacherName || "TBD"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {sch.department}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <Users className="h-3 w-3 text-gray-400" />
                        {sch.enrolledStudentsCount} students
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {sch.status === "scheduled" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="h-3 w-3" /> Scheduled
                        </span>
                      )}
                      {sch.status === "completed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                      )}
                      {sch.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="h-3 w-3" /> No Class (Cancelled)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleToggleCancel(sch)}
                        title={sch.status === "cancelled" ? "Restore session" : "Cancel session (No Class)"}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                          sch.status === "cancelled"
                            ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                            : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                        }`}
                      >
                        {sch.status === "cancelled" ? "Restore" : "Cancel"}
                      </button>
                      <button
                        onClick={() => openEditModal(sch)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit schedule session"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingSchedule(sch)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete schedule session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSchedules.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No schedule sessions found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE */}
      {viewMode === "timeline" && (
        <div className="space-y-4">
          {Array.from(new Set(filteredSchedules.map((s) => s.date))).sort().map((date) => {
            const dateSessions = filteredSchedules.filter((s) => s.date === date);
            return (
              <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-black text-gray-900">{date}</h3>
                      <p className="text-xs text-indigo-600 font-semibold">
                        {dateSessions[0]?.sundayName || (dateSessions[0]?.sundayNumber ? `Sunday ${dateSessions[0].sundayNumber}` : "Sunday Schedule")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {dateSessions.length} session{dateSessions.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dateSessions.map((sch) => (
                    <div
                      key={sch._id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        sch.status === "cancelled"
                          ? "bg-red-50/40 border-red-200 opacity-75"
                          : sch.status === "completed"
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-gray-50/60 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-black text-gray-900">{sch.grade}</span>
                        <span className="font-semibold text-gray-600">{sch.startTime} - {sch.endTime}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {sch.topic || "Regular Curriculum Session"}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50 text-[11px] text-gray-500">
                        <span>Teacher: {sch.assignedTeacherName || "TBD"}</span>
                        <span className="font-bold">
                          {sch.status === "cancelled" ? "Cancelled" : sch.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT SCHEDULE */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-black text-gray-900">
                  {editingSchedule ? "Edit Schedule Session" : "Create New Class Session"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="e.g. 2018"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Semester *
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Department *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Grade *
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Class / Section
                  </label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Sunday Theme / Name
                  </label>
                  <input
                    type="text"
                    value={formSundayName}
                    onChange={(e) => setFormSundayName(e.target.value)}
                    placeholder="e.g. ዘወረደ (Zewerede)"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Session Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ScheduleStatus)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="scheduled">Scheduled (Active)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled (No Class)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Class Topic / Lesson
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Chapter 4: Orthodoxy & Faith"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Assigned Teacher
                  </label>
                  <input
                    type="text"
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    placeholder="Teacher name"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes or instructions for the session..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE */}
      {deletingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-black text-gray-900">Delete Schedule Session</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to permanently delete the session for{" "}
              <strong>{deletingSchedule.grade}</strong> on <strong>{deletingSchedule.date}</strong>?
            </p>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSchedule(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
