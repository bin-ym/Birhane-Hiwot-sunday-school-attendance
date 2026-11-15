"use client";

import React, { useState, useMemo } from "react";
import {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
  ETHIOPIAN_WEEKDAYS,
  ETHIOPIAN_MONTH_OPTIONS,
  getDaysInEthiopianMonth,
  getEthiopianDayOfWeek,
  ethiopianToGregorian,
  gregorianToEthiopian,
  formatEthiopianDateAmharic,
  isEthiopianLeapYear,
} from "@/lib/utils";
import { AttendanceCalendarMode } from "@/lib/constants";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  Sparkles,
  Info,
  Clock,
  Lock,
} from "lucide-react";

export interface AttendanceRecordItem {
  date: string; // e.g. "5 Meskerem 2017"
  present: boolean;
  hasPermission?: boolean;
  reason?: string;
  markedBy?: string;
  timestamp?: string;
}

export interface EthiopianAttendanceCalendarProps {
  year: number; // Ethiopian Year (e.g. 2017)
  mode?: AttendanceCalendarMode; // "sundays_only" | "all_days"
  classMeetingDay?: "Saturday" | "Sunday"; // student's class meeting day
  classSessionName?: string;
  scheduleStartDate?: string; // Gregorian ISO string e.g. "2024-09-11"
  scheduleEndDate?: string; // Gregorian ISO string e.g. "2025-06-30"
  attendanceRecords?: AttendanceRecordItem[];
  selectedDate?: string | null;
  onSelectDate?: (dateStr: string) => void;
  className?: string;
}

export function EthiopianAttendanceCalendar({
  year,
  mode = "sundays_only",
  classMeetingDay = "Sunday",
  classSessionName,
  scheduleStartDate,
  scheduleEndDate,
  attendanceRecords = [],
  selectedDate,
  onSelectDate,
  className = "",
}: EthiopianAttendanceCalendarProps) {
  // Current real-world Ethiopian date for highlighting "Today"
  const todayEthiopian = useMemo(() => gregorianToEthiopian(new Date()), []);
  const isCurrentYear = todayEthiopian.year === year;

  // Active viewing month (1-13)
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (isCurrentYear) return Math.min(13, Math.max(1, todayEthiopian.month));
    return 1; // Default to Meskerem for historical or advance years
  });

  // Schedule boundary dates
  const scheduleStartG = useMemo(() => {
    if (!scheduleStartDate) return null;
    const d = new Date(scheduleStartDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [scheduleStartDate]);

  const scheduleEndG = useMemo(() => {
    if (!scheduleEndDate) return null;
    const d = new Date(scheduleEndDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [scheduleEndDate]);

  // Attendance lookup map by date string
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordItem>();
    for (const record of attendanceRecords) {
      if (record?.date) {
        map.set(record.date.trim(), record);
      }
    }
    return map;
  }, [attendanceRecords]);

  // Total days in the currently viewed month
  const totalDaysInMonth = useMemo(() => {
    return getDaysInEthiopianMonth(year, currentMonth);
  }, [year, currentMonth]);

  // Day of week of the 1st day of the month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  // Shift so Monday is index 0 and Sunday is index 6
  const startDayPadding = useMemo(() => {
    const dow = getEthiopianDayOfWeek(year, currentMonth, 1);
    return (dow + 6) % 7;
  }, [year, currentMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => (prev > 1 ? prev - 1 : 13));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => (prev < 13 ? prev + 1 : 1));
  };

  // Month metadata
  const currentMonthEnglish = ETHIOPIAN_MONTHS[currentMonth - 1];
  const currentMonthAmharic = ETHIOPIAN_MONTHS_AMHARIC[currentMonth - 1];
  const isPagume = currentMonth === 13;
  const isLeapYear = isEthiopianLeapYear(year);

  // Month attendance statistics
  const monthStats = useMemo(() => {
    let present = 0;
    let permission = 0;
    let absent = 0;
    let validSessions = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const gDate = ethiopianToGregorian(year, currentMonth, day);
      gDate.setHours(12, 0, 0, 0);

      const isSunday = gDate.getDay() === 0;
      const isSaturday = gDate.getDay() === 6;
      const isMeetingDay = classMeetingDay === "Saturday" ? isSaturday : isSunday;
      const inSchedule =
        (!scheduleStartG || gDate >= scheduleStartG) &&
        (!scheduleEndG || gDate <= scheduleEndG);

      const isValidSession = inSchedule && (mode === "all_days" || isMeetingDay);
      if (isValidSession) {
        validSessions++;
        const dateStr = `${day} ${currentMonthEnglish} ${year}`;
        const rec = attendanceMap.get(dateStr);
        if (rec) {
          if (rec.present) present++;
          else if (rec.hasPermission) permission++;
          else absent++;
        }
      }
    }

    return { present, permission, absent, validSessions };
  }, [
    year,
    currentMonth,
    totalDaysInMonth,
    currentMonthEnglish,
    scheduleStartG,
    scheduleEndG,
    mode,
    classMeetingDay,
    attendanceMap,
  ]);

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
    >
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="h-4 w-4" />
            <span>የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ሰንበት ት/ቤት ካሌንደር</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900">
              {currentMonthAmharic}
            </h3>
            <span className="text-sm font-semibold text-gray-500">
              ({currentMonthEnglish})
            </span>
            <span className="text-lg font-bold text-indigo-600 ml-1">
              {year} ዓ.ም.
            </span>
          </div>
          {isPagume && (
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              ጳጉሜ {totalDaysInMonth} ቀናት ({isLeapYear ? "ዘመነ ዮሐንስ / ሉቃስ — የዘመን መለወጫ ዕረፍት (6 ቀናት)" : "መደበኛ ዓመት (5 ቀናት)"})
            </p>
          )}
        </div>

        {/* Month Navigation & Jump Selector */}
        <div className="flex items-center gap-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden"
          >
            {ETHIOPIAN_MONTH_OPTIONS.map((m) => (
              <option key={m.index} value={m.index}>
                {m.index}. {m.display}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month (የቀደመው ወር)"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-2xs transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month (የሚቀጥለው ወር)"
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-2xs transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mode & Schedule Context Strip ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-700">የአቴንዳንስ ሕግ:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
              mode === "sundays_only"
                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {mode === "sundays_only"
              ? classMeetingDay === "Saturday"
                ? "ቅዳሜ ብቻ (Saturdays Only)"
                : "እሁድ ብቻ (Sundays Only)"
              : "በሙሉ ቀናት (All Days)"}
          </span>
          {classSessionName && (
            <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-50 text-amber-900 border border-amber-200">
              ክፍል: {classSessionName}
            </span>
          )}
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            በወሩ {monthStats.validSessions} ክፍለ ጊዜያት አሉ
          </span>
        </div>

        {/* Schedule bounds in Ethiopian date */}
        {(scheduleStartG || scheduleEndG) && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>የመርሐ ግብር ወሰን:</span>
            <span className="font-semibold text-gray-800">
              {scheduleStartG ? formatEthiopianDateAmharic(scheduleStartG) : "መጀመሪያ"}
              {" — "}
              {scheduleEndG ? formatEthiopianDateAmharic(scheduleEndG) : "መጨረሻ"}
            </span>
          </div>
        )}
      </div>

      {/* ─── Ethiopian Weekday Header Grid (ሰኞ to እሁድ) ─── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
        {ETHIOPIAN_WEEKDAYS.map((wd) => {
          const isMeetingCol =
            classMeetingDay === "Saturday" ? wd.dayIndex === 6 : wd.dayIndex === 0;
          return (
            <div
              key={wd.english}
              className={`py-2 rounded-lg ${
                isMeetingCol
                  ? "bg-indigo-50/80 text-indigo-950 font-black border border-indigo-200 shadow-2xs"
                  : "bg-gray-50/60 text-gray-600"
              }`}
            >
              <div className="text-sm font-black">{wd.amharic}</div>
              <div className="text-[10px] text-gray-400 font-medium">
                {wd.english}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Ethiopian Days Grid ─── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Leading empty padding cells */}
        {Array.from({ length: startDayPadding }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="min-h-[64px] sm:min-h-[76px] rounded-xl bg-gray-50/30 border border-transparent"
          />
        ))}

        {/* Month Day Cells */}
        {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateStr = `${day} ${currentMonthEnglish} ${year}`;
          const gDate = ethiopianToGregorian(year, currentMonth, day);
          gDate.setHours(12, 0, 0, 0);

          const isSunday = gDate.getDay() === 0;
          const isSaturday = gDate.getDay() === 6;
          const isMeetingDay = classMeetingDay === "Saturday" ? isSaturday : isSunday;
          const inSchedule =
            (!scheduleStartG || gDate >= scheduleStartG) &&
            (!scheduleEndG || gDate <= scheduleEndG);

          const isUnavailableByMode = mode === "sundays_only" && !isMeetingDay;
          const isSelectable = inSchedule && !isUnavailableByMode;

          const isToday =
            isCurrentYear &&
            todayEthiopian.month === currentMonth &&
            todayEthiopian.day === day;

          const isSelected = selectedDate === dateStr;
          const record = attendanceMap.get(dateStr);

          // Status determination
          let statusBadge: React.ReactNode = null;
          if (record) {
            if (record.present) {
              statusBadge = (
                <span
                  title="ተገኝቷል (Present)"
                  className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">ተገኝቷል</span>
                </span>
              );
            } else if (record.hasPermission) {
              statusBadge = (
                <span
                  title="ፈቃድ (Permission)"
                  className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md"
                >
                  <MinusCircle className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">ፈቃድ</span>
                </span>
              );
            } else {
              statusBadge = (
                <span
                  title="ቀሪ (Absent)"
                  className="flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md"
                >
                  <XCircle className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">ቀሪ</span>
                </span>
              );
            }
          }

          return (
            <button
              type="button"
              key={dateStr}
              onClick={() => {
                if (onSelectDate && isSelectable) {
                  onSelectDate(dateStr);
                }
              }}
              disabled={!isSelectable && !onSelectDate}
              className={`relative flex flex-col justify-between p-2 min-h-[64px] sm:min-h-[76px] rounded-xl border text-left transition ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200 shadow-sm"
                  : isToday
                  ? "border-amber-400 bg-amber-50/30"
                  : isMeetingDay && inSchedule
                  ? "border-indigo-100 bg-indigo-50/20 hover:border-indigo-300"
                  : isSelectable
                  ? "border-gray-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                  : "border-gray-100 bg-gray-50/40 text-gray-300 cursor-not-allowed opacity-60"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-sm sm:text-base font-black ${
                    isSelected
                      ? "text-indigo-900"
                      : isToday
                      ? "text-amber-800 font-black"
                      : isMeetingDay
                      ? "text-indigo-800"
                      : isSelectable
                      ? "text-gray-800"
                      : "text-gray-400"
                  }`}
                >
                  {day}
                </span>

                {isToday && (
                  <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                    ዛሬ
                  </span>
                )}

                {isMeetingDay && inSchedule && !isToday && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                    title={classMeetingDay === "Saturday" ? "ቅዳሜ / Saturday" : "ሰንበት / Sunday"}
                  />
                )}

                {!inSchedule && (
                  <span title="ከመርሐ ግብር ውጭ / Outside schedule period">
                    <Lock className="h-3 w-3 text-gray-300" />
                  </span>
                )}
              </div>

              {/* Status pill or inactive indicator */}
              <div className="w-full mt-1">
                {statusBadge ? (
                  statusBadge
                ) : !inSchedule ? (
                  <span className="text-[9px] text-gray-400 hidden sm:inline">
                    ውጭ
                  </span>
                ) : isUnavailableByMode ? (
                  <span className="text-[9px] text-gray-400 hidden sm:inline">
                    —
                  </span>
                ) : isSelectable ? (
                  <span className="text-[9px] text-gray-400 hidden sm:inline font-mono">
                    ክፍለ ጊዜ
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Legend & Key ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>ተገኝቷል ({monthStats.present})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span>ፈቃድ ({monthStats.permission})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span>ቀሪ ({monthStats.absent})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <span>ሰንበት (Sunday)</span>
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          * የኢትዮጵያ ቀን አቆጣጠር እንደ ዋና የቀን መቁጠሪያነት ያገለግላል
        </div>
      </div>
    </div>
  );
}
