"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  STUDENT_CLASSIFICATIONS,
  StudentClassification,
} from "@/lib/constants";
import { getCurrentEthiopianYear, getAcademicYearLifecycle } from "@/lib/utils";
import { RBACInspector } from "@/components/auth/RBACInspector";
import { AttendanceCalendarSettingsTab } from "@/components/settings/AttendanceCalendarSettingsTab";
import { ClassSessionsSettingsTab } from "@/components/settings/ClassSessionsSettingsTab";
import { EthiopianDatePicker } from "@/components/calendar/EthiopianDatePicker";

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

type SettingsTab =
  | "academic-registration"
  | "class-sessions"
  | "security-roles"
  | "attendance-calendar";

// Date validation helper for individual classification
function validateCategoryDates(p: PeriodState): string | null {
  const s = p.startDate.trim();
  const e = p.endDate.trim();
  const c = p.registrationClosedDate.trim();

  if (s && e && s > e) {
    return "Start Date must be on or before End Date";
  }
  if (e && c && e > c) {
    return "Registration Closed Date must be on or after End Date";
  }
  if (s && c && s > c) {
    return "Start Date must be on or before Registration Closed Date";
  }
  return null;
}

// Compute real-time registration status for display
function getPeriodStatus(p: PeriodState, academicYear: number): {
  label: string;
  variant: "open" | "upcoming" | "closed" | "disabled";
} {
  if (!p.isActive) {
    return { label: "Disabled / Inactive", variant: "disabled" };
  }

  const lifecycle = getAcademicYearLifecycle(academicYear);
  if (lifecycle.status === "past") {
    return { label: "Past Year (Archived — Intake Closed)", variant: "closed" };
  }
  if (lifecycle.status === "upcoming") {
    return { label: "Upcoming Year (Advance Setup — Inactive)", variant: "upcoming" };
  }

  // Today in Addis Ababa time zone
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type: string) =>
    dateParts.find((part) => part.type === type)?.value || "";
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  const s = p.startDate.trim();
  const e = p.endDate.trim();
  const c = p.registrationClosedDate.trim();

  if (s && today < s) {
    return { label: `Upcoming (Opens ${s})`, variant: "upcoming" };
  }
  if ((e && today > e) || (c && today > c)) {
    return { label: "Registration Closed", variant: "closed" };
  }
  return { label: "Registration Open", variant: "open" };
}

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const currentEthiopianYear = getCurrentEthiopianYear();

  const [activeTab, setActiveTab] = useState<SettingsTab>("academic-registration");
  const [selectedYear, setSelectedYear] = useState<number>(currentEthiopianYear);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState<Record<string, PeriodState>>({});
  const [initialPeriods, setInitialPeriods] = useState<Record<string, PeriodState>>({});

  // 5 Year Range for selection (e.g. 2016 to 2020 EC)
  const availableAcademicYears = useMemo(() => {
    return [
      currentEthiopianYear - 2,
      currentEthiopianYear - 1,
      currentEthiopianYear,
      currentEthiopianYear + 1,
      currentEthiopianYear + 2,
    ];
  }, [currentEthiopianYear]);

  // Auth gate
  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  // Fetch periods for the currently selected academic year
  const fetchPeriods = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/category-periods?academicYear=${year}`);

      if (!res.ok) {
        throw new Error("Failed to fetch category periods");
      }

      const data = (await res.json()) as Array<{
        classification: StudentClassification;
        startDate?: string;
        endDate?: string;
        registrationClosedDate?: string;
        isActive?: boolean;
      }>;

      const map: Record<string, PeriodState> = {};
      STUDENT_CLASSIFICATIONS.forEach((c) => {
        map[c.value] = createDefaultPeriod();
      });

      data.forEach((period) => {
        if (!period || !period.classification) return;
        map[period.classification] = {
          startDate: period.startDate || "",
          endDate: period.endDate || "",
          registrationClosedDate: period.registrationClosedDate || "",
          isActive: period.isActive ?? true,
        };
      });

      setPeriods(map);
      setInitialPeriods(JSON.parse(JSON.stringify(map)));
    } catch {
      toast.error(`Failed to load registration periods for ${year} EC`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods(selectedYear);
  }, [selectedYear, fetchPeriods]);

  // Check for unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(periods) !== JSON.stringify(initialPeriods);
  }, [periods, initialPeriods]);

  // Update a field for a specific classification
  const updateField = (
    cls: StudentClassification,
    field: keyof PeriodState,
    value: string | boolean,
  ) => {
    setPeriods((prev) => ({
      ...prev,
      [cls]: {
        ...(prev[cls] ?? createDefaultPeriod()),
        [field]: value,
      },
    }));
  };

  // Revert changes back to server state
  const handleReset = () => {
    setPeriods(JSON.parse(JSON.stringify(initialPeriods)));
    toast.success("Changes discarded.");
  };

  // Single atomic batch save operation
  const handleSaveAll = async () => {
    // Validate all categories first
    for (const category of STUDENT_CLASSIFICATIONS) {
      const p = periods[category.value] ?? createDefaultPeriod();
      const err = validateCategoryDates(p);
      if (err) {
        toast.error(`${category.label}: ${err}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = STUDENT_CLASSIFICATIONS.map((category) => {
        const p = periods[category.value] ?? createDefaultPeriod();
        return {
          classification: category.value,
          academicYear: String(selectedYear),
          startDate: p.startDate,
          endDate: p.endDate,
          registrationClosedDate: p.registrationClosedDate,
          isActive: p.isActive,
        };
      });

      const res = await fetch("/api/category-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Batch update failed");
      }

      setInitialPeriods(JSON.parse(JSON.stringify(periods)));
      toast.success(
        `All 5 category registration windows saved successfully for ${selectedYear} EC!`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save category periods";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "Super Admin") return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <Toaster position="top-right" />

      {/* ─── Top Executive Banner ─── */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              Super Admin Settings
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">
              Institution System Configuration
            </h1>
            <p className="mt-1 text-xs text-indigo-200/80 sm:text-sm">
              Manage student classification intake windows and inspect system security access matrix.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-bold text-white">
              Current EC: {currentEthiopianYear} EC
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab("academic-registration")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "academic-registration"
                ? "bg-white text-indigo-950 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Academic Year & Registration Windows
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("class-sessions")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "class-sessions"
                ? "bg-white text-indigo-950 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Layers className="h-4 w-4" />
            Class / Session Architecture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security-roles")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "security-roles"
                ? "bg-white text-indigo-950 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Security & Role Permissions Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance-calendar")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "attendance-calendar"
                ? "bg-white text-indigo-950 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Clock className="h-4 w-4" />
            Attendance & Calendar Rules
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ACADEMIC YEAR & REGISTRATION                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "academic-registration" && (
        <div className="space-y-6">
          {/* Academic Year Control Bar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="academic-year-select"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1"
                >
                  Target Academic Year (Ethiopian Calendar)
                </label>
                <p className="text-xs text-gray-400">
                  Select an academic year to review or configure registration windows for that student cohort.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  id="academic-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={loading || saving}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-800 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {availableAcademicYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} EC {yr === currentEthiopianYear ? "(Current Year)" : yr > currentEthiopianYear ? "(Upcoming)" : "(Past Year)"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => fetchPeriods(selectedYear)}
                  disabled={loading || saving}
                  title="Reload periods"
                  className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Unsaved Changes Indicator */}
            {isDirty && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold">
                    You have unsaved changes for {selectedYear} EC.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="font-bold underline hover:text-amber-950 transition"
                >
                  Discard Changes
                </button>
              </div>
            )}
          </div>

          {/* Academic Year Lifecycle Banner */}
          {(() => {
            const lifecycle = getAcademicYearLifecycle(selectedYear);
            if (lifecycle.status === "current") {
              return (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900 text-sm">
                      Current Active Academic Year ({selectedYear} EC)
                    </p>
                    <p className="mt-0.5 text-emerald-800">
                      This is the active registration context. Any new students registering will be enrolled under this academic year, and registration availability will follow the configured start/end date windows below.
                    </p>
                  </div>
                </div>
              );
            }
            if (lifecycle.status === "past") {
              return (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900 text-sm">
                      Past Academic Year — Historical Archive ({selectedYear} EC)
                    </p>
                    <p className="mt-0.5 text-amber-800">
                      This academic year has ended. New student registration is permanently locked and inactive to protect data integrity. All historical records, student enrollments, fee payment histories, and academic results remain fully preserved for reporting and administrative audits.
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-950">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-blue-900 text-sm">
                    Upcoming Academic Year — Advance Configuration ({selectedYear} EC)
                  </p>
                  <p className="mt-0.5 text-blue-800">
                    You can configure and schedule registration windows in advance for this upcoming cohort. Registration intake automatically remains inactive until this academic year rolls over to become the current active year.
                  </p>
                </div>
              </div>
            );
          })()}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Category Registration Cards Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {STUDENT_CLASSIFICATIONS.map((category) => {
                  const p = periods[category.value] ?? createDefaultPeriod();
                  const status = getPeriodStatus(p, selectedYear);
                  const dateError = validateCategoryDates(p);

                  return (
                    <div
                      key={category.value}
                      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition ${
                        dateError
                          ? "border-red-300 ring-2 ring-red-100"
                          : p.isActive
                          ? "border-gray-200 hover:border-indigo-200"
                          : "border-gray-200 bg-gray-50/50 opacity-80"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="space-y-2 border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">
                              {category.label}
                            </h3>
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              {category.value}
                            </span>
                          </div>

                          {/* Active / Inactive Switch */}
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={p.isActive}
                              onChange={(e) =>
                                updateField(category.value, "isActive", e.target.checked)
                              }
                              className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                          </label>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                          {category.description}
                        </p>

                        {/* Real-time Status Badge */}
                        <div className="pt-1">
                          {status.variant === "open" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {status.label}
                            </span>
                          ) : status.variant === "upcoming" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              {status.label}
                            </span>
                          ) : status.variant === "closed" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                              {status.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                              Disabled / Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ethiopian Date Pickers */}
                      <div className="mt-4 space-y-3">
                        <EthiopianDatePicker
                          label="Start Date (ምዝገባ መክፈቻ)"
                          value={p.startDate}
                          disabled={!p.isActive}
                          defaultEthiopianYear={selectedYear}
                          helperText="Date when registration officially opens for this cohort."
                          onChange={(val) =>
                            updateField(category.value, "startDate", val)
                          }
                          placeholder="የመክፈቻ ቀን ይምረጡ"
                        />

                        <EthiopianDatePicker
                          label="End Date (መደበኛ ምዝገባ ማብቂያ)"
                          value={p.endDate}
                          disabled={!p.isActive}
                          defaultEthiopianYear={selectedYear}
                          helperText="Scheduled end of regular enrollment applications."
                          onChange={(val) =>
                            updateField(category.value, "endDate", val)
                          }
                          placeholder="የማብቂያ ቀን ይምረጡ"
                        />

                        <EthiopianDatePicker
                          label="Registration Closed Date (የመጨረሻ ማጠቃለያ)"
                          value={p.registrationClosedDate}
                          disabled={!p.isActive}
                          defaultEthiopianYear={selectedYear}
                          helperText="Hard deadline after which all student creation is blocked."
                          onChange={(val) =>
                            updateField(
                              category.value,
                              "registrationClosedDate",
                              val,
                            )
                          }
                          placeholder="የመጨረሻ ማጠቃለያ ቀን ይምረጡ"
                        />

                        {/* Inline Error */}
                        {dateError && (
                          <div className="rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-700 border border-red-200 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                            <span>{dateError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bottom Bar: Batch Save & Discard */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  <span>Saving applies atomically to all 5 classifications for </span>
                  <strong className="text-gray-900">{selectedYear} EC</strong>.
                </div>

                <div className="flex items-center gap-3">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={saving}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Discard Changes
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition ${
                      saving
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-indigo-600 hover:bg-indigo-700 active:translate-y-0"
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Saving Batch...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save All Categories ({selectedYear} EC)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: CLASS / SESSION ARCHITECTURE                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "class-sessions" && (
        <ClassSessionsSettingsTab />
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: SECURITY & ROLE PERMISSIONS MATRIX                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "security-roles" && (
        <div className="space-y-6">
          <RBACInspector />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ATTENDANCE & CALENDAR RULES                                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance-calendar" && (
        <AttendanceCalendarSettingsTab />
      )}
    </div>
  );
}
