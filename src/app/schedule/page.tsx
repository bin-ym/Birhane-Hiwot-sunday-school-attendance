"use client";

import { useEffect, useState } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { toast, Toaster } from "react-hot-toast";
import { Save, ShieldCheck } from "lucide-react";
import {
  STUDENT_CLASSIFICATIONS,
  StudentClassification,
  CLASSIFICATION_SCHEDULE,
} from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
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

export default function ScheduleManagerPage() {
  const { canManageSchedules, role } = useRBAC();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentYear = getCurrentEthiopianYear();

  const [periods, setPeriods] = useState<Record<string, PeriodState>>({});

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

        const periodMap: Record<string, PeriodState> = {};
        STUDENT_CLASSIFICATIONS.forEach((c) => {
          periodMap[c.value] = createDefaultPeriod();
        });

        data.forEach((period) => {
          if (!period || !period.classification) return;
          periodMap[period.classification] = {
            startDate: period.startDate
              ? new Date(period.startDate).toISOString().slice(0, 10)
              : "",
            endDate: period.endDate
              ? new Date(period.endDate).toISOString().slice(0, 10)
              : "",
            registrationClosedDate: period.registrationClosedDate
              ? new Date(period.registrationClosedDate).toISOString().slice(0, 10)
              : "",
            isActive: period.isActive ?? true,
          };
        });

        setPeriods(periodMap);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load category periods");
      } finally {
        setLoading(false);
      }
    }

    fetchPeriods();
  }, [currentYear]);

  const handleChange = (
    val: StudentClassification,
    field: keyof PeriodState,
    value: string | boolean,
  ) => {
    setPeriods((prev) => ({
      ...prev,
      [val]: {
        ...(prev[val] || createDefaultPeriod()),
        [field]: value,
      },
    }));
  };

  const handleSave = async (val: StudentClassification) => {
    const period = periods[val];
    if (!period) return;

    setSaving(true);
    try {
      const res = await fetch("/api/category-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification: val,
          academicYear: currentYear,
          startDate: period.startDate
            ? new Date(period.startDate).toISOString()
            : null,
          endDate: period.endDate ? new Date(period.endDate).toISOString() : null,
          registrationClosedDate: period.registrationClosedDate
            ? new Date(period.registrationClosedDate).toISOString()
            : null,
          isActive: period.isActive,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save period");
      }

      toast.success(`${val} schedule and period updated successfully!`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-amber-700 to-orange-700 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200 mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Schedule Management Portal ({role || "Schedule Manager"})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Academic Schedule & Registration Periods
          </h1>
          <p className="text-amber-100 text-sm mt-1">
            Configure attendance timelines and registration periods for academic year {currentYear} E.C.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading schedules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STUDENT_CLASSIFICATIONS.map((c) => {
            const period = periods[c.value] || createDefaultPeriod();
            const defaultSchedule = CLASSIFICATION_SCHEDULE[c.value] || "Standard schedule";

            return (
              <div
                key={c.value}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{c.label}</span>
                      <span className="block text-[11px] text-gray-400 font-mono">{c.value}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={period.isActive}
                        onChange={(e) => handleChange(c.value, "isActive", e.target.checked)}
                        disabled={!canManageSchedules}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span className={period.isActive ? "text-emerald-700 font-bold" : "text-gray-400"}>
                        {period.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 mb-4">
                    📅 Schedule: <span className="font-semibold text-gray-700">{defaultSchedule}</span>
                  </p>

                  <div className="space-y-3">
                    <EthiopianDatePicker
                      label="Registration Open Date (ምዝገባ መክፈቻ)"
                      value={period.startDate}
                      onChange={(val) => handleChange(c.value, "startDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />

                    <EthiopianDatePicker
                      label="Registration Close Date (የመጨረሻ ማጠቃለያ)"
                      value={period.registrationClosedDate}
                      onChange={(val) => handleChange(c.value, "registrationClosedDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />

                    <EthiopianDatePicker
                      label="Period End Date (መደበኛ ማብቂያ)"
                      value={period.endDate}
                      onChange={(val) => handleChange(c.value, "endDate", val)}
                      disabled={!canManageSchedules}
                      defaultEthiopianYear={currentYear}
                    />
                  </div>
                </div>

                {canManageSchedules && (
                  <button
                    onClick={() => handleSave(c.value)}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save {c.label} Period</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
