"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
  ETHIOPIAN_WEEKDAYS,
  ETHIOPIAN_MONTH_OPTIONS,
  getDaysInEthiopianMonth,
  getEthiopianDayOfWeek,
  ethiopianToGregorian,
  gregorianToEthiopian,
  isEthiopianLeapYear,
} from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Check,
  Sparkles,
} from "lucide-react";

export interface EthiopianDatePickerProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string; // Gregorian ISO "YYYY-MM-DD"
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  minDate?: string; // Gregorian ISO "YYYY-MM-DD"
  maxDate?: string; // Gregorian ISO "YYYY-MM-DD"
  defaultEthiopianYear?: number; // Target year context (e.g. 2018)
  className?: string;
}

// Convert Gregorian Date object to standard "YYYY-MM-DD" string
function formatGregorianIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format Gregorian Date to user-friendly English display e.g. "September 11, 2025"
function formatGregorianLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function EthiopianDatePicker({
  id,
  name,
  label,
  value = "",
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  placeholder = "ቀን ይምረጡ (Select Ethiopian Date)",
  minDate,
  maxDate,
  defaultEthiopianYear,
  className = "",
}: EthiopianDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Today in Ethiopian calendar
  const todayEth = useMemo(() => gregorianToEthiopian(new Date()), []);

  // Parse current selected value (Gregorian ISO) to Ethiopian
  const selectedEthDate = useMemo(() => {
    if (!value || typeof value !== "string" || !value.includes("-")) {
      return null;
    }
    const [yStr, mStr, dStr] = value.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const gDate = new Date(y, m - 1, d, 12, 0, 0);
    const eth = gregorianToEthiopian(gDate);
    return {
      ...eth,
      gregorianDate: gDate,
      isoString: value,
    };
  }, [value]);

  // Calendar viewport state (Year and Month being browsed)
  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedEthDate) return selectedEthDate.year;
    if (defaultEthiopianYear) return defaultEthiopianYear;
    return todayEth.year;
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (selectedEthDate) return selectedEthDate.month;
    if (defaultEthiopianYear && defaultEthiopianYear !== todayEth.year) return 1; // Meskerem
    return todayEth.month;
  });

  // Keep view aligned if value changes externally or defaultEthiopianYear changes
  useEffect(() => {
    if (selectedEthDate) {
      setViewYear(selectedEthDate.year);
      setViewMonth(selectedEthDate.month);
    } else if (defaultEthiopianYear) {
      setViewYear(defaultEthiopianYear);
    }
  }, [selectedEthDate, defaultEthiopianYear]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth > 1) {
      setViewMonth(viewMonth - 1);
    } else {
      setViewMonth(13);
      setViewYear((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth < 13) {
      setViewMonth(viewMonth + 1);
    } else {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    }
  };

  // Select day handler
  const handleSelectDay = (day: number) => {
    const gDate = ethiopianToGregorian(viewYear, viewMonth, day);
    const isoString = formatGregorianIso(gDate);
    onChange(isoString);
    setIsOpen(false);
  };

  // Select today handler
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const gDate = new Date();
    const isoString = formatGregorianIso(gDate);
    onChange(isoString);
    setViewYear(todayEth.year);
    setViewMonth(todayEth.month);
    setIsOpen(false);
  };

  // Clear date handler
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Month & Day calculations for current viewport
  const totalDays = useMemo(() => {
    return getDaysInEthiopianMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Day padding: Mon is index 0, Sun is index 6
  const startDayPadding = useMemo(() => {
    const dow = getEthiopianDayOfWeek(viewYear, viewMonth, 1);
    return (dow + 6) % 7;
  }, [viewYear, viewMonth]);

  const isPagume = viewMonth === 13;
  const isLeap = isEthiopianLeapYear(viewYear);

  // Year options list around viewport (+- 5 years)
  const availableYears = useMemo(() => {
    const base = defaultEthiopianYear || todayEth.year;
    const years: number[] = [];
    for (let y = base - 6; y <= base + 6; y++) {
      years.push(y);
    }
    return years;
  }, [defaultEthiopianYear, todayEth.year]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-semibold text-gray-700"
        >
          <CalendarIcon className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* ─── Main Input / Display Button ─── */}
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition outline-none ${
          error
            ? "border-red-300 bg-red-50/50 text-red-900 ring-1 ring-red-200"
            : disabled
            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-75"
            : isOpen
            ? "border-indigo-500 bg-white ring-2 ring-indigo-100 shadow-sm"
            : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 text-gray-800"
        }`}
      >
        <div className="flex flex-col truncate pr-2">
          {selectedEthDate ? (
            <div className="flex flex-wrap items-baseline gap-1.5">
              {/* Primary Ethiopian Format */}
              <span className="font-bold text-gray-900 text-xs sm:text-[13px]">
                {ETHIOPIAN_MONTHS_AMHARIC[selectedEthDate.month - 1]} {selectedEthDate.day}, {selectedEthDate.year} ዓ.ም.
              </span>
              {/* Secondary Gregorian Format */}
              <span className="text-[11px] text-gray-500 font-medium">
                ({formatGregorianLong(selectedEthDate.gregorianDate)})
              </span>
            </div>
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedEthDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear date (ቀን አጥፋ)"
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="p-1 text-indigo-600">
            <CalendarIcon className="h-4 w-4" />
          </div>
        </div>
      </button>

      {/* Helper text / error message */}
      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-0.5 text-[10px] text-gray-400">{helperText}</p>
      ) : null}

      {/* ─── Interactive Ethiopian Calendar Popover ─── */}
      {isOpen && !disabled && (
        <div className="absolute left-0 z-50 mt-1.5 w-80 sm:w-88 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Controls: Month & Year Selector */}
          <div className="space-y-3 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-1">
              {/* Previous Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month (ያለፈው ወር)"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                {ETHIOPIAN_MONTH_OPTIONS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.index}. {m.amharic} ({m.english})
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} ዓ.ም.
                  </option>
                ))}
              </select>

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month (የሚቀጥለው ወር)"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Pagumē Banner */}
            {isPagume && (
              <div className="rounded-lg bg-amber-50 p-2 text-center text-[11px] font-semibold text-amber-800 border border-amber-200">
                <span>ጳጉሜ {totalDays} ቀናት — </span>
                <span className="font-normal">
                  {isLeap ? "ዘመነ ዮሐንስ/ሉቃስ (Leap Year — 6 Days)" : "መደበኛ ዓመት (Regular — 5 Days)"}
                </span>
              </div>
            )}
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
            {ETHIOPIAN_WEEKDAYS.map((wd) => (
              <span
                key={wd.dayIndex}
                className="text-[11px] font-bold text-gray-500"
                title={`${wd.amharic} (${wd.english})`}
              >
                {wd.amharic}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 py-1">
            {/* Start Padding Slots */}
            {Array.from({ length: startDayPadding }).map((_, idx) => (
              <div key={`pad-${idx}`} className="h-8" />
            ))}

            {/* Month Days */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1;
              const gDate = ethiopianToGregorian(viewYear, viewMonth, day);
              const iso = formatGregorianIso(gDate);

              const isSelected =
                selectedEthDate?.year === viewYear &&
                selectedEthDate?.month === viewMonth &&
                selectedEthDate?.day === day;

              const isToday =
                todayEth.year === viewYear &&
                todayEth.month === viewMonth &&
                todayEth.day === day;

              // Check min/max boundary
              const isBeforeMin = minDate ? iso < minDate : false;
              const isAfterMax = maxDate ? iso > maxDate : false;
              const isDayDisabled = isBeforeMin || isAfterMax;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDayDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-full rounded-lg text-xs font-bold transition flex items-center justify-center relative ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm font-black"
                      : isToday
                      ? "border border-indigo-500 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                      : isDayDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  }`}
                  title={`${ETHIOPIAN_MONTHS_AMHARIC[viewMonth - 1]} ${day}, ${viewYear} (${formatGregorianLong(gDate)})`}
                >
                  <span>{day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-indigo-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── Selected Date Display & Quick Action Footer ─── */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            {selectedEthDate ? (
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-gray-900">
                    {ETHIOPIAN_MONTHS_AMHARIC[selectedEthDate.month - 1]} {selectedEthDate.day}, {selectedEthDate.year} ዓ.ም.
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Gregorian: {formatGregorianLong(selectedEthDate.gregorianDate)}
                  </p>
                </div>
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 italic text-center">
                ምንም ቀን አልተመረጠም (No date selected)
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleSelectToday}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>ዛሬ (Today)</span>
              </button>

              <div className="flex items-center gap-1">
                {selectedEthDate && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    አጥፋ (Clear)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  ዝጋ (Done)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
