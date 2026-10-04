"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { Calendar, Save, CheckCircle2, AlertCircle } from "lucide-react";
import {
  STUDENT_CLASSIFICATIONS,
  StudentClassification,
} from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";

interface PeriodState {
  startDate: string;
  endDate: string;
  registrationClosedDate: string;
  isActive: boolean;
}

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentYear = getCurrentEthiopianYear();
  const [periods, setPeriods] = useState<
    Record<string, PeriodState>
  >({});

  // Guard: only Super Admin
  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  // Fetch existing periods on mount
  useEffect(() => {
    async function fetchPeriods() {
      try {
        const res = await fetch(
          `/api/category-periods?academicYear=${currentYear}`,
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        const map: Record<string, PeriodState> = {};
        // Initialise all classifications with empty defaults
        STUDENT_CLASSIFICATIONS.forEach((c) => {
          map[c.value] = {
            startDate: "",
            endDate: "",
            registrationClosedDate: "",
            isActive: true,
          };
        });
        // Overlay with saved data
        (data as any[]).forEach((p) => {
          map[p.classification] = {
            startDate: p.startDate || "",
            endDate: p.endDate || "",
            registrationClosedDate: p.registrationClosedDate || "",
            isActive: p.isActive ?? true,
          };
        });
        setPeriods(map);
      } catch {
        toast.error("Failed to load category periods");
      } finally {
        setLoading(false);
      }
    }
    fetchPeriods();
  }, [currentYear]);

  const updateField = (
    cls: StudentClassification,
    field: keyof PeriodState,
    value: string | boolean,
  ) => {
    setPeriods((prev) => ({
      ...prev,
      [cls]: { ...prev[cls], [field]: value },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = STUDENT_CLASSIFICATIONS.map(async (c) => {
        const p = periods[c.value] || {
          startDate: "",
          endDate: "",
          registrationClosedDate: "",
          isActive: true,
        };
        const res = await fetch("/api/category-periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classification: c.value,
            academicYear: String(currentYear),
            startDate: p.startDate,
            endDate: p.endDate,
            registrationClosedDate: p.registrationClosedDate,
            isActive: p.isActive,
          }),
        });
        if (!res.ok) throw new Error(`Failed to save ${c.label}`);
      });
      await Promise.all(promises);
      toast.success("All category periods saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "Super Admin") return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Toaster position="top-right" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 rounded-2xl p-6 sm:p-8 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-2">
          Super Admin Settings
        </p>
        <h1 className="text-2xl sm:text-3xl font-black">
          Category Registration Periods
        </h1>
        <p className="mt-2 text-sm text-white/80">
          ለᑛllen ምድቦች የመመዝገብ ጊዜ ያሰናዱ — Set start, end, and
          registration-closed dates for all student categories.
        </p>
        <p className="text-xs text-white/50 mt-1">
          Academic Year: {currentYear} EC
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STUDENT_CLASSIFICATIONS.map((cls) => {
              const p = periods[cls.value] || {
                startDate: "",
                endDate: "",
                registrationClosedDate: "",
                isActive: true,
              };
              return (
                <div
                  key={cls.value}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {cls.label}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {cls.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) =>
                          updateField(cls.value, "isActive", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {/* Date fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <Calendar className="inline w-3 h-3 mr-1" />
                        መጀመሪያ ቀን (Start Date)
                      </label>
                      <input
                        type="date"
                        value={p.startDate}
                        onChange={(e) =>
                          updateField(cls.value, "startDate", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <Calendar className="inline w-3 h-3 mr-1" />
                        መጨረሻ ቀን (End Date)
                      </label>
                      <input
                        type="date"
                        value={p.endDate}
                        onChange={(e) =>
                          updateField(cls.value, "endDate", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <AlertCircle className="inline w-3 h-3 mr-1" />
                        መዝገብ ተሰ AssemblyVersion ቀን (Registration Closed Date)
                      </label>
                      <input
                        type="date"
                        value={p.registrationClosedDate}
                        onChange={(e) =>
                          updateField(
                            cls.value,
                            "registrationClosedDate",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    {p.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Active
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-500 font-medium">
                          Inactive
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Periods
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
