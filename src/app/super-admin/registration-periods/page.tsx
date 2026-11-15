"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  STUDENT_CLASSIFICATIONS,
  CLASSIFICATION_SCHEDULE,
  StudentClassification,
} from "@/lib/constants";
import { getCurrentEthiopianYear, isCategoryRegistrationOpen } from "@/lib/utils";

interface CategoryPeriodItem {
  _id?: string;
  classification: StudentClassification;
  academicYear: string;
  startDate: string;
  endDate: string;
  registrationClosedDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SuperAdminRegistrationPeriodsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [periods, setPeriods] = useState<CategoryPeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<CategoryPeriodItem | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<CategoryPeriodItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    classification: StudentClassification;
    academicYear: string;
    startDate: string;
    endDate: string;
    registrationClosedDate: string;
    isActive: boolean;
  }>({
    classification: "Regular",
    academicYear: String(getCurrentEthiopianYear()),
    startDate: "",
    endDate: "",
    registrationClosedDate: "",
    isActive: true,
  });

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const fetchPeriods = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/v1/category-periods");
      if (!res.ok) throw new Error("Failed to load registration periods");
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load periods");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // Distinct academic years for filter
  const availableYears = useMemo(() => {
    const years = [...new Set(periods.map((p) => String(p.academicYear)))].filter(Boolean);
    const curr = String(getCurrentEthiopianYear());
    if (!years.includes(curr)) years.push(curr);
    return years.sort((a, b) => b.localeCompare(a));
  }, [periods]);

  // Filtered periods
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      if (yearFilter && String(p.academicYear) !== yearFilter) return false;
      if (classificationFilter && p.classification !== classificationFilter) return false;
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "inactive" && p.isActive) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const catInfo = STUDENT_CLASSIFICATIONS.find((c) => c.value === p.classification);
        const matchCat =
          p.classification.toLowerCase().includes(q) ||
          (catInfo?.label || "").toLowerCase().includes(q) ||
          (catInfo?.description || "").toLowerCase().includes(q);
        const matchYear = String(p.academicYear).includes(q);
        if (!matchCat && !matchYear) return false;
      }
      return true;
    });
  }, [periods, yearFilter, classificationFilter, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = periods.length;
    const active = periods.filter((p) => p.isActive).length;
    const currentlyOpen = periods.filter((p) => isCategoryRegistrationOpen(p)).length;
    const uniqueYears = new Set(periods.map((p) => p.academicYear)).size;
    return { total, active, currentlyOpen, uniqueYears };
  }, [periods]);

  const handleOpenCreate = () => {
    setFormData({
      classification: "Regular",
      academicYear: String(getCurrentEthiopianYear()),
      startDate: "",
      endDate: "",
      registrationClosedDate: "",
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (p: CategoryPeriodItem) => {
    setEditingPeriod(p);
    setFormData({
      classification: p.classification,
      academicYear: String(p.academicYear),
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      registrationClosedDate: p.registrationClosedDate || "",
      isActive: p.isActive ?? true,
    });
  };

  const handleSave = async (isEdit = false) => {
    if (!formData.classification || !formData.academicYear) {
      toast.error("Category and Academic Year are required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        classification: formData.classification,
        academicYear: String(formData.academicYear).trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationClosedDate: formData.registrationClosedDate,
        isActive: formData.isActive,
      };

      if (isEdit && editingPeriod?._id) {
        payload._id = editingPeriod._id;
      }

      const res = await fetch("/api/v1/category-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save registration period");
      }

      toast.success(
        isEdit
          ? "Registration period updated successfully"
          : "Registration period created successfully",
      );

      setIsCreateOpen(false);
      setEditingPeriod(null);
      await fetchPeriods(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (p: CategoryPeriodItem) => {
    try {
      const res = await fetch("/api/v1/category-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: p._id,
          classification: p.classification,
          academicYear: p.academicYear,
          startDate: p.startDate,
          endDate: p.endDate,
          registrationClosedDate: p.registrationClosedDate,
          isActive: !p.isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      toast.success(
        `${p.classification} period is now ${!p.isActive ? "Active" : "Inactive"}`,
      );
      await fetchPeriods(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deletingPeriod?._id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/category-periods?id=${deletingPeriod._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete registration period");
      }

      toast.success("Registration period deleted successfully");
      setDeletingPeriod(null);
      await fetchPeriods(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== "Super Admin") return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300 backdrop-blur">
                Super Admin Console
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <Clock className="h-3 w-3" />
                Current Year: {getCurrentEthiopianYear()} EC
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">
              Category Registration Periods
            </h1>
            <p className="mt-1 text-sm text-indigo-200/90 max-w-2xl">
              Manage admission windows, opening dates, and closing rules for Regular, Extension,
              Sign Language, Summer, and BeGena Sunday school programs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPeriods(false)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition-all hover:bg-white/20 active:scale-95"
              title="Refresh periods"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-400 active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              New Registration Period
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Periods</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{stats.total}</div>
          <p className="mt-1 text-[11px] text-gray-400">Configured across all academic years</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{stats.active}</div>
          <p className="mt-1 text-[11px] text-gray-400">Enabled periods in database</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Currently Open</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">{stats.currentlyOpen}</div>
          <p className="mt-1 text-[11px] text-gray-400">Within active registration window today</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Academic Years</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">{stats.uniqueYears}</div>
          <p className="mt-1 text-[11px] text-gray-400">Distinct years on record</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search category, academic year, schedule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              Filter by:
            </div>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Academic Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} EC
                </option>
              ))}
            </select>

            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {STUDENT_CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(searchTerm || yearFilter || classificationFilter || statusFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setYearFilter("");
                  setClassificationFilter("");
                  setStatusFilter("");
                }}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold">Loading registration periods...</p>
          </div>
        ) : filteredPeriods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-base font-bold text-gray-800">No Registration Periods Found</p>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {periods.length === 0
                ? "No category registration periods have been created yet. Click 'New Registration Period' above to get started."
                : "No periods match your selected filter criteria. Try clearing filters or searching for another term."}
            </p>
            {periods.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow"
              >
                <Plus className="h-4 w-4" />
                Add First Period
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3.5">Category / Classification</th>
                  <th className="px-5 py-3.5">Academic Year</th>
                  <th className="px-5 py-3.5">Start Date</th>
                  <th className="px-5 py-3.5">End Date</th>
                  <th className="px-5 py-3.5">Registration Closes</th>
                  <th className="px-5 py-3.5">Admission Status</th>
                  <th className="px-5 py-3.5">Period State</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPeriods.map((period) => {
                  const cat = STUDENT_CLASSIFICATIONS.find(
                    (c) => c.value === period.classification,
                  );
                  const schedule = CLASSIFICATION_SCHEDULE[period.classification];
                  const isOpen = isCategoryRegistrationOpen(period);

                  return (
                    <tr
                      key={period._id || `${period.classification}-${period.academicYear}`}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      {/* Classification */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">
                            {cat?.label || period.classification}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {schedule || cat?.description}
                          </span>
                        </div>
                      </td>

                      {/* Academic Year */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                          {period.academicYear} EC
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                        {period.startDate ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {period.startDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Immediate</span>
                        )}
                      </td>

                      {/* End Date */}
                      <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                        {period.endDate ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {period.endDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No limit</span>
                        )}
                      </td>

                      {/* Registration Closed Date */}
                      <td className="px-5 py-4 text-xs text-gray-600 font-mono">
                        {period.registrationClosedDate ? (
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {period.registrationClosedDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Admission Window Status */}
                      <td className="px-5 py-4">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Registration Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Closed
                          </span>
                        )}
                      </td>

                      {/* Active Toggle */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(period)}
                          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            period.isActive ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                          title={`Click to ${period.isActive ? "deactivate" : "activate"}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              period.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(period)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                            title="Edit Period"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingPeriod(period)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Period"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Notice Card */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-indigo-600 mt-0.5" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-bold">How registration windows work:</span> When a student is registered,
            the system verifies whether the current date falls between the Start Date and End Date (or before
            the Registration Closed Date) for that student&apos;s category. If a period is set to inactive or
            closed, registration for that classification will be disabled in the student registration wizard.
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150 sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Registration Period</h2>
                <p className="text-xs text-gray-500">Configure registration schedule for a category</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Student Category / Classification *
                </label>
                <select
                  value={formData.classification}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      classification: e.target.value as StudentClassification,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {STUDENT_CLASSIFICATIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} ({CLASSIFICATION_SCHEDULE[c.value]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Academic Year (Ethiopian Calendar) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2018"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, academicYear: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Registration Closed Date (Optional Hard Cutoff)
                </label>
                <input
                  type="date"
                  value={formData.registrationClosedDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrationClosedDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
                <div>
                  <div className="text-xs font-bold text-gray-800">Is Period Active?</div>
                  <div className="text-[11px] text-gray-500">
                    If disabled, registration for this category will be locked.
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md disabled:bg-gray-400"
              >
                {submitting ? "Saving..." : "Create Period"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150 sm:p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Registration Period</h2>
                <p className="text-xs text-gray-500">
                  Update schedule for {editingPeriod.classification} ({editingPeriod.academicYear} EC)
                </p>
              </div>
              <button
                onClick={() => setEditingPeriod(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Category / Classification
                </label>
                <select
                  value={formData.classification}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      classification: e.target.value as StudentClassification,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none"
                >
                  {STUDENT_CLASSIFICATIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} ({CLASSIFICATION_SCHEDULE[c.value]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, academicYear: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Registration Closed Date
                </label>
                <input
                  type="date"
                  value={formData.registrationClosedDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrationClosedDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
                <div>
                  <div className="text-xs font-bold text-gray-800">Is Period Active?</div>
                  <div className="text-[11px] text-gray-500">
                    Controls whether this registration window is enabled.
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md disabled:bg-gray-400"
              >
                {submitting ? "Saving..." : "Update Period"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-100 p-2.5">
                <Trash2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delete Registration Period?</h2>
            </div>

            <p className="mt-3 text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete the registration period for{" "}
              <strong className="text-gray-900 font-bold">{deletingPeriod.classification}</strong> (Academic
              Year <strong className="text-gray-900 font-bold">{deletingPeriod.academicYear} EC</strong>)?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setDeletingPeriod(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-md disabled:bg-gray-400"
              >
                {submitting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
