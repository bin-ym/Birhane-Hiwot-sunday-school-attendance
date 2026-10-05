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

const createDefaultPeriod = (): PeriodState => ({
  startDate: "",
  endDate: "",
  registrationClosedDate: "",
  isActive: true,
});

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentYear = getCurrentEthiopianYear();

  const [periods, setPeriods] = useState<Record<string, PeriodState>>({});

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchPeriods() {
      try {
        const res = await fetch(
          `/api/category-periods?academicYear=${currentYear}`,
        );

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
      [cls]: {
        ...(prev[cls] ?? createDefaultPeriod()),
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);

    try {
      const promises = STUDENT_CLASSIFICATIONS.map(async (category) => {
        const p = periods[category.value] ?? createDefaultPeriod();

        const res = await fetch("/api/category-periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classification: category.value,
            academicYear: String(currentYear),
            startDate: p.startDate,
            endDate: p.endDate,
            registrationClosedDate: p.registrationClosedDate,
            isActive: p.isActive,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to save ${category.label}`);
        }
      });

      await Promise.all(promises);
      toast.success("All category periods saved successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "Super Admin") return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Toaster position="top-right" />

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
          Super Admin Settings
        </p>
        <h1 className="text-2xl font-black sm:text-3xl">
          Category Registration Periods
        </h1>
        <p className="mt-2 text-sm text-white/80">
          Set the registration start, end, and close dates for every student category.
        </p>
        <p className="mt-1 text-xs text-white/50">
          Academic Year: {currentYear} EC
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {STUDENT_CLASSIFICATIONS.map((category) => {
              const p = periods[category.value] ?? createDefaultPeriod();

              return (
                <div
                  key={category.value}
                  className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {category.label}
                      </h2>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>

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

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={p.startDate}
                        onChange={(e) =>
                          updateField(category.value, "startDate", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={p.endDate}
                        onChange={(e) =>
                          updateField(category.value, "endDate", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        <AlertCircle className="mr-1 inline h-3 w-3" />
                        Registration Closed Date
                      </label>
                      <input
                        type="date"
                        value={p.registrationClosedDate}
                        onChange={(e) =>
                          updateField(
                            category.value,
                            "registrationClosedDate",
                            e.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {p.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium text-green-700">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-500">Inactive</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all ${
                saving
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
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
