"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AttendanceCalendarMode } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { EthiopianAttendanceCalendar } from "@/components/calendar/EthiopianAttendanceCalendar";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Check,
  ShieldAlert,
} from "lucide-react";

export function AttendanceCalendarSettingsTab() {
  const currentEthiopianYear = getCurrentEthiopianYear();

  const [persistedMode, setPersistedMode] = useState<AttendanceCalendarMode>("sundays_only");
  const [selectedMode, setSelectedMode] = useState<AttendanceCalendarMode>("sundays_only");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreviewDate, setSelectedPreviewDate] = useState<string | null>(null);

  // Load current settings from API
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/attendance");
      if (res.ok) {
        const data = await res.json();
        const mode = data.mode || "sundays_only";
        setPersistedMode(mode);
        setSelectedMode(mode);
        setUpdatedAt(data.updatedAt || null);
        setUpdatedBy(data.updatedBy || null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance settings:", err);
      toast.error("Failed to load attendance calendar settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isDirty = selectedMode !== persistedMode;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update attendance calendar mode");
      }

      setPersistedMode(selectedMode);
      setUpdatedAt(new Date().toISOString());
      toast.success(data.message || "Attendance calendar mode saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedMode(persistedMode);
  };

  return (
    <div className="space-y-6">
      {/* ─── Mode Configuration Card ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="h-4 w-4" />
            <span>Attendance Calendar Configuration</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Attendance Calendar Rules & Active Mode
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Configure whether student attendance is strictly limited to liturgical Sundays or open to all weekdays within active schedule periods.
          </p>
        </div>

        {/* Option Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Sundays Only */}
          <div
            onClick={() => setSelectedMode("sundays_only")}
            className={`cursor-pointer relative flex flex-col justify-between rounded-2xl border p-5 transition ${
              selectedMode === "sundays_only"
                ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  እሁድ ብቻ · Sundays Only
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Recommended Default
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-gray-900">
                  Liturgical Sundays Only
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Attendance can only be recorded and viewed on valid liturgical Sundays that fall inside the student cohort's schedule period. Non-Sundays are unavailable.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Calculates actual Sundays using astronomical Ethiopian date conversion</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Enforces category period start and end boundaries</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center justify-between text-xs font-bold text-indigo-900">
              <span>{selectedMode === "sundays_only" ? "Active Selection" : "Click to Select"}</span>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  selectedMode === "sundays_only"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300"
                }`}
              >
                {selectedMode === "sundays_only" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          {/* Option 2: All Days */}
          <div
            onClick={() => setSelectedMode("all_days")}
            className={`cursor-pointer relative flex flex-col justify-between rounded-2xl border p-5 transition ${
              selectedMode === "all_days"
                ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-100 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  በሙሉ ቀናት · All Days
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Flexible / Dev / Daily
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-gray-900">
                  All Weekdays & Sundays
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Attendance can be recorded on any valid day (Monday through Sunday) within the configured schedule period. Useful for testing, daily seminars, or special sessions.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Enables attendance taking on weekdays and weekends</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Respects classification period start and end boundaries</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center justify-between text-xs font-bold text-blue-900">
              <span>{selectedMode === "all_days" ? "Active Selection" : "Click to Select"}</span>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  selectedMode === "all_days"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300"
                }`}
              >
                {selectedMode === "all_days" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>
        </div>

        {/* Unsaved Changes & Persistence Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {updatedAt ? (
              <p>
                Last persisted: <span className="font-semibold text-gray-700">{new Date(updatedAt).toLocaleString()}</span>
                {updatedBy && <span> by <span className="font-semibold text-gray-700">{updatedBy}</span></span>}
              </p>
            ) : (
              <p>Currently using system default configuration (<span className="font-semibold text-gray-700">Sundays Only</span>).</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition ${
                !isDirty || saving
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-md active:translate-y-0"
              }`}
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Live Ethiopian Calendar Demonstration & Preview ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              የቀን መቁጠሪያ ቅድመ-ዕይታ · Live Ethiopian Calendar Preview
            </h3>
            <p className="text-xs text-gray-500">
              Interactive preview demonstrating how the selected mode ({selectedMode === "sundays_only" ? "Sundays Only" : "All Days"}) operates on the Ethiopian Calendar for {currentEthiopianYear} ዓ.ም.
            </p>
          </div>
          {selectedPreviewDate && (
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              Selected: {selectedPreviewDate}
            </span>
          )}
        </div>

        <EthiopianAttendanceCalendar
          year={currentEthiopianYear}
          mode={selectedMode}
          selectedDate={selectedPreviewDate}
          onSelectDate={(d) => setSelectedPreviewDate(d)}
        />
      </div>
    </div>
  );
}
