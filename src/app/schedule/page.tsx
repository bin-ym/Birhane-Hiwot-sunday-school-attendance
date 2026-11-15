"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  CalendarX,
  Sparkles,
  Tag,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  GRADES,
  STUDENT_CLASSIFICATIONS,
  StudentClassification,
  CLASSIFICATION_SCHEDULE,
  CLASSIFICATION_GRADE_OPTIONS,
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

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  All: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  Regular: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Extension: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  SignLanguage: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  Summer: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  begena: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export default function SchedulerManagerPage() {
  const { user } = useAuth();
  const { canManageSchedules } = useRBAC();
  const currentYear = getCurrentEthiopianYear();

  const [activeTab, setActiveTab] = useState<"schedules" | "periods">("schedules");

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
  const [classificationFilter, setClassificationFilter] = useState("");

  // Quick Declare Status by Classification State
  const [quickDate, setQuickDate] = useState(new Date().toISOString().slice(0, 10));
  const [quickClassification, setQuickClassification] = useState<string>("All");
  const [quickGrade, setQuickGrade] = useState<string>("All");
  const [quickStatus, setQuickStatus] = useState<ScheduleStatus>("scheduled");
  const [quickNotes, setQuickNotes] = useState<string>("");
  const [quickDeclaring, setQuickDeclaring] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EnrichedSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Modal
  const [formSemester, setFormSemester] = useState(SEMESTERS[0]);
  const [formClassification, setFormClassification] = useState<string>("All");
  const [formGrade, setFormGrade] = useState<string>(GRADES[0]);
  const [formSection, setFormSection] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSundayName, setFormSundayName] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:30");
  const [formEndTime, setFormEndTime] = useState("11:30");
  const [formStatus, setFormStatus] = useState<ScheduleStatus>("scheduled");
  const [formTopic, setFormTopic] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Grade options dynamically linked to student classification for Quick Declare
  const availableQuickGrades = useMemo(() => {
    if (quickClassification === "All") {
      return [
        ...CLASSIFICATION_GRADE_OPTIONS.Regular,
        ...CLASSIFICATION_GRADE_OPTIONS.Extension,
        ...CLASSIFICATION_GRADE_OPTIONS.SignLanguage,
        ...CLASSIFICATION_GRADE_OPTIONS.Summer,
        ...CLASSIFICATION_GRADE_OPTIONS.begena,
      ];
    }
    const key = quickClassification as StudentClassification;
    return CLASSIFICATION_GRADE_OPTIONS[key] || CLASSIFICATION_GRADE_OPTIONS.Regular;
  }, [quickClassification]);

  // Grade options dynamically linked to student classification for Modal
  const availableFormGrades = useMemo(() => {
    if (formClassification === "All") {
      return [
        ...CLASSIFICATION_GRADE_OPTIONS.Regular,
        ...CLASSIFICATION_GRADE_OPTIONS.Extension,
        ...CLASSIFICATION_GRADE_OPTIONS.SignLanguage,
        ...CLASSIFICATION_GRADE_OPTIONS.Summer,
        ...CLASSIFICATION_GRADE_OPTIONS.begena,
      ];
    }
    const key = formClassification as StudentClassification;
    return CLASSIFICATION_GRADE_OPTIONS[key] || CLASSIFICATION_GRADE_OPTIONS.Regular;
  }, [formClassification]);

  const handleQuickClassificationChange = (newClassification: string) => {
    setQuickClassification(newClassification);
    setQuickGrade("All");
  };

  const handleFormClassificationChange = (newClassification: string) => {
    setFormClassification(newClassification);
    const key = newClassification as StudentClassification;
    const grades = (newClassification !== "All" && CLASSIFICATION_GRADE_OPTIONS[key])
      ? CLASSIFICATION_GRADE_OPTIONS[key]
      : CLASSIFICATION_GRADE_OPTIONS.Regular;
    if (grades.length > 0) {
      setFormGrade(grades[0].value);
    }
  };

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

  const fetchSchedules = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      params.set("academicYear", String(currentYear));
      params.set("department", userDepartment);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (classificationFilter) params.set("classification", classificationFilter);

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
  }, [currentYear, userDepartment, gradeFilter, statusFilter, classificationFilter]);

  const fetchPeriods = useCallback(async () => {
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
  }, [currentYear]);

  useEffect(() => {
    fetchSchedules();
    fetchPeriods();
  }, [fetchSchedules, fetchPeriods]);

  // Handle Quick Declare Class Status by Classification
  const handleQuickDeclareStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickDeclaring(true);
    try {
      const isAllGrades = quickGrade === "All";
      const payload: Record<string, unknown> = {
        academicYear: String(currentYear),
        semester: formSemester,
        department: userDepartment,
        classification: quickClassification,
        grade: isAllGrades ? "All" : quickGrade,
        declareAllGrades: isAllGrades,
        date: quickDate,
        status: quickStatus,
        notes: quickNotes.trim() || undefined,
        topic: quickStatus === "cancelled" ? "No Class Scheduled" : "Regular Curriculum Session",
        startTime: "08:30",
        endTime: "11:30",
      };

      const res = await fetch("/api/v1/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to declare class status");

      const label =
        quickStatus === "scheduled"
          ? `Class confirmed (ትምህርት አለ) for ${quickClassification}`
          : `Declared NO CLASS (ትምህርት የለም / ዝግ) for ${quickClassification}`;

      toast.success(label);
      setQuickNotes("");
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to declare status");
    } finally {
      setQuickDeclaring(false);
    }
  };

  // Direct toggle on row (Scheduled <-> Cancelled)
  const handleToggleRowStatus = async (sch: EnrichedSchedule) => {
    const nextStatus: ScheduleStatus = sch.status === "cancelled" ? "scheduled" : "cancelled";
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sch._id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update session status");
      }

      toast.success(
        nextStatus === "scheduled"
          ? `${sch.grade} marked active (ትምህርት አለ)`
          : `${sch.grade} marked NO CLASS (ትምህርት የለም / ዝግ)`
      );
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDeleteSchedule = async (id: string, gradeName: string, date: string) => {
    if (!window.confirm(`Are you sure you want to delete the schedule session for "${gradeName}" on ${date}?`)) {
      return;
    }
    try {
      const res = await fetch("/api/v1/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete schedule session");
      toast.success("Schedule session deleted successfully");
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete schedule");
    }
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormSemester(SEMESTERS[0]);
    setFormClassification("All");
    setFormGrade(GRADES[0]);
    setFormSection("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSundayName("");
    setFormStartTime("08:30");
    setFormEndTime("11:30");
    setFormStatus("scheduled");
    setFormTopic("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (sch: EnrichedSchedule) => {
    setEditingSchedule(sch);
    setFormSemester(sch.semester);
    setFormClassification(sch.classification || "All");
    setFormGrade(sch.grade);
    setFormSection(sch.section || "");
    setFormDate(sch.date);
    setFormSundayName(sch.sundayName || "");
    setFormStartTime(sch.startTime);
    setFormEndTime(sch.endTime);
    setFormStatus(sch.status);
    setFormTopic(sch.topic || "");
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
        classification: formClassification,
        grade: formGrade,
        section: formSection.trim() || undefined,
        date: formDate,
        sundayName: formSundayName.trim() || undefined,
        startTime: formStartTime,
        endTime: formEndTime,
        status: formStatus,
        topic: formTopic.trim() || undefined,
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
      const matchSearch =
        s.grade.toLowerCase().includes(term) ||
        (s.topic && s.topic.toLowerCase().includes(term)) ||
        (s.assignedTeacherName && s.assignedTeacherName.toLowerCase().includes(term)) ||
        s.date.includes(term) ||
        (s.classification && s.classification.toLowerCase().includes(term));

      const matchClassification =
        !classificationFilter ||
        classificationFilter === "All" ||
        s.classification === classificationFilter ||
        s.classification === "All" ||
        !s.classification;

      return matchSearch && matchClassification;
    });
  }, [schedules, searchTerm, classificationFilter]);

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
            Department schedule & classification management for <strong>{userDepartment}</strong> ({currentYear} E.C.)
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
            Class Schedules & Classification Control ({schedules.length})
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

      {/* TAB 1: SCHEDULES & CLASSIFICATION CLASS CONTROLLER */}
      {activeTab === "schedules" && (
        <div className="space-y-6">
          {/* Classification Class Status Controller Card */}
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">
                    Student Classification Class Controller (የተማሪዎች ምድብ ትምህርት ሁኔታ ማወጃ)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Declare whether there is class or no class (day off/holiday) for specific student categories.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Scheduler Authority
              </span>
            </div>

            {/* Quick Class Status Controller Banner */}
            <form onSubmit={handleQuickDeclareStatus} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* 1. Target Date with Ethiopian Calendar */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Target Date (ቀን - የኢትዮጵያ ዘመን አቆጣጠር)
                  </label>
                  <EthiopianDatePicker
                    value={quickDate}
                    onChange={(val) => setQuickDate(val)}
                    defaultEthiopianYear={currentYear}
                    placeholder="ቀን ይምረጡ"
                  />
                </div>

                {/* 2. Classification */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Student Classification (ምድብ)
                  </label>
                  <select
                    value={quickClassification}
                    onChange={(e) => handleQuickClassificationChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="All">All Classifications (ለሁሉም ምድቦች)</option>
                    {STUDENT_CLASSIFICATIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} ({CLASSIFICATION_SCHEDULE[c.value] || "Schedule"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Grade Scope linked to Classification */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Grade Scope (ክፍል)
                  </label>
                  <select
                    value={quickGrade}
                    onChange={(e) => setQuickGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="All">
                      {quickClassification === "All"
                        ? "All Grades (ለሁሉም ክፍሎች)"
                        : `All ${quickClassification} Grades (ለሁሉም የ${quickClassification} ክፍሎች)`}
                    </option>
                    {availableQuickGrades.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label || g.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Class Status Switch */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Class Status (ሁኔታ)
                  </label>
                  <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-100 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setQuickStatus("scheduled")}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                        quickStatus === "scheduled"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Has Class (አለ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickStatus("cancelled")}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                        quickStatus === "cancelled"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      No Class (የለም)
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes & Reason row */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Reason / Note (e.g. Public Holiday, Church Feast, Special Program, Mid-term Break)..."
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={quickDeclaring}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition disabled:opacity-50 shrink-0"
                >
                  {quickDeclaring ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : quickStatus === "scheduled" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <CalendarX className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span>
                    {quickDeclaring
                      ? "Applying..."
                      : quickStatus === "scheduled"
                        ? "Confirm Class Active"
                        : "Declare No Class"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by topic, grade, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Classification Filter */}
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Classifications (ምድብ)</option>
                {STUDENT_CLASSIFICATIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Grades (ክፍል)</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses (ሁኔታ)</option>
                <option value="scheduled">Class Scheduled (ትምህርት አለ)</option>
                <option value="completed">Completed (የተጠናቀቀ)</option>
                <option value="cancelled">No Class / Day Off (ትምህርት የለም)</option>
              </select>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Sunday</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Grade & Section</th>
                    <th className="py-3 px-4">Time Window</th>
                    <th className="py-3 px-4">Lesson Topic / Reason</th>
                    <th className="py-3 px-4">Class Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSchedules.map((sch) => {
                    const classTheme =
                      CLASSIFICATION_COLORS[sch.classification || "All"] ||
                      CLASSIFICATION_COLORS.All;

                    return (
                      <tr key={sch._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{sch.date}</div>
                          <div className="text-[11px] text-indigo-600 font-medium">
                            {sch.sundayName || "Sunday Class"}
                          </div>
                        </td>

                        {/* Classification Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${classTheme.bg} ${classTheme.text} ${classTheme.border}`}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {sch.classification || "All"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {sch.grade} {sch.section ? `(${sch.section})` : ""}
                        </td>

                        <td className="py-3.5 px-4 text-gray-700 font-mono">
                          {sch.startTime} - {sch.endTime}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs truncate text-gray-800 font-medium">
                          {sch.topic || (sch.status === "cancelled" ? "No Class Scheduled" : "Regular Curriculum Session")}
                          {sch.notes && (
                            <span className="block text-[10px] text-gray-400 font-normal truncate">
                              Note: {sch.notes}
                            </span>
                          )}
                        </td>

                        {/* Interactive Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleRowStatus(sch)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                              sch.status === "scheduled"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : sch.status === "completed"
                                  ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                                  : "bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                            }`}
                            title="Click to toggle between Has Class and No Class"
                          >
                            {sch.status === "scheduled" && (
                              <>
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                <span>Class Active (ትምህርት አለ)</span>
                              </>
                            )}
                            {sch.status === "completed" && (
                              <>
                                <CheckCircle className="h-3 w-3 text-blue-600" />
                                <span>Completed (ተጠናቋል)</span>
                              </>
                            )}
                            {sch.status === "cancelled" && (
                              <>
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span>No Class (ትምህርት የለም)</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => openEditModal(sch)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit session details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(sch._id, sch.grade, sch.date)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSchedules.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <CalendarX className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-700">No schedules found</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Use the &ldquo;Student Classification Class Controller&rdquo; above or click &ldquo;Schedule Session&rdquo; to add classes.
                        </p>
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
                    📅 Schedule Pattern: <span className="font-semibold text-gray-700">{CLASSIFICATION_SCHEDULE[c.value] || "Standard Weekend Schedule"}</span>
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
              {/* Classification & Grade row with dynamic linkage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Student Classification *
                  </label>
                  <select
                    value={formClassification}
                    onChange={(e) => handleFormClassificationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="All">All Classifications</option>
                    {STUDENT_CLASSIFICATIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Grade *</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    {availableFormGrades.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label || g.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status & Section row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Class Status *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ScheduleStatus)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="scheduled">Class Scheduled (ትምህርት አለ)</option>
                    <option value="cancelled">No Class / Cancelled (ትምህርት የለም)</option>
                    <option value="completed">Completed (ተጠናቋል)</option>
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

              {/* Ethiopian Date Picker in Modal */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Date (ቀን) *</label>
                <EthiopianDatePicker
                  value={formDate}
                  onChange={(val) => setFormDate(val)}
                  defaultEthiopianYear={currentYear}
                  placeholder="የኢትዮጵያ ቀን ይምረጡ"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className="block font-bold text-gray-700 uppercase mb-1">Lesson Topic / Reason</label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. Genesis 1: The Creation / Holiday Notice"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional details or instructions..."
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
