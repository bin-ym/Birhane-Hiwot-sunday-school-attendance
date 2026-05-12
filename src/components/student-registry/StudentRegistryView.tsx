"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Student } from "@/lib/models";
import { getCurrentEthiopianYear } from "@/lib/utils";

export type StudentRegistryTheme = "indigo" | "sky" | "emerald" | "violet";

const THEME: Record<
  StudentRegistryTheme,
  {
    hero: string;
    badgeText: string;
    statCard: string;
    statLabel: string;
    filterFocus: string;
    spin: string;
    rowHover: string;
    pill: string;
    btn: string;
  }
> = {
  indigo: {
    hero: "from-slate-900 via-indigo-950 to-violet-900",
    badgeText: "text-indigo-200",
    statCard: "bg-white/10",
    statLabel: "text-indigo-200",
    filterFocus: "focus:border-indigo-400 focus:ring-indigo-100",
    spin: "border-indigo-600",
    rowHover: "hover:bg-indigo-50/40",
    pill: "border-indigo-100 bg-indigo-50 text-indigo-800",
    btn: "bg-indigo-600 hover:bg-indigo-700",
  },
  sky: {
    hero: "from-sky-950 via-blue-900 to-indigo-950",
    badgeText: "text-sky-200",
    statCard: "bg-white/10",
    statLabel: "text-sky-200",
    filterFocus: "focus:border-sky-400 focus:ring-sky-100",
    spin: "border-sky-500",
    rowHover: "hover:bg-sky-50/50",
    pill: "border-sky-200 bg-sky-50 text-sky-900",
    btn: "bg-sky-600 hover:bg-sky-700",
  },
  emerald: {
    hero: "from-emerald-950 via-teal-900 to-cyan-950",
    badgeText: "text-emerald-200",
    statCard: "bg-white/10",
    statLabel: "text-emerald-200",
    filterFocus: "focus:border-emerald-400 focus:ring-emerald-100",
    spin: "border-emerald-600",
    rowHover: "hover:bg-emerald-50/50",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-900",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  violet: {
    hero: "from-violet-950 via-purple-900 to-indigo-950",
    badgeText: "text-violet-200",
    statCard: "bg-white/10",
    statLabel: "text-violet-200",
    filterFocus: "focus:border-violet-400 focus:ring-violet-100",
    spin: "border-violet-600",
    rowHover: "hover:bg-violet-50/40",
    pill: "border-violet-200 bg-violet-50 text-violet-900",
    btn: "bg-violet-600 hover:bg-violet-700",
  },
};

export type StudentRegistryViewProps = {
  students: Student[];
  loading: boolean;
  error: string | null;
  basePath: string;
  theme: StudentRegistryTheme;
  badge: string;
  title: string;
  description: string;
  /** Hide academic year filter (e.g. list is already current-year only). */
  hideYearFilter?: boolean;
  actionLabel?: string;
};

export function StudentRegistryView({
  students,
  loading,
  error,
  basePath,
  theme,
  badge,
  title,
  description,
  hideYearFilter = false,
  actionLabel = "View",
}: StudentRegistryViewProps) {
  const t = THEME[theme];
  const currentYear = getCurrentEthiopianYear();

  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const yearOptions = useMemo(() => {
    const ys = [...new Set(students.map((s) => String(s.Academic_Year)))].sort(
      (a, b) => String(b).localeCompare(String(a)),
    );
    return ys;
  }, [students]);

  const gradeOptions = useMemo(() => {
    return [...new Set(students.map((s) => s.Grade))].sort();
  }, [students]);

  const sexOptions = useMemo(() => {
    return [...new Set(students.map((s) => s.Sex))].sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      if (!hideYearFilter && yearFilter && String(s.Academic_Year) !== yearFilter)
        return false;
      if (gradeFilter && s.Grade !== gradeFilter) return false;
      if (sexFilter && s.Sex !== sexFilter) return false;
      if (!q) return true;
      return (
        (s.Unique_ID || "").toLowerCase().includes(q) ||
        (s.First_Name || "").toLowerCase().includes(q) ||
        (s.Father_Name || "").toLowerCase().includes(q) ||
        (s.Grade || "").toLowerCase().includes(q)
      );
    });
  }, [students, searchTerm, gradeFilter, sexFilter, yearFilter, hideYearFilter]);

  const thisYearCount = students.filter(
    (s) => String(s.Academic_Year) === String(currentYear),
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 sm:space-y-8 sm:px-6 lg:px-8">
      <div
        className={`overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl sm:rounded-3xl sm:p-8 lg:p-10 ${t.hero}`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs ${t.badgeText}`}
            >
              {badge}
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              {description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div
              className={`rounded-xl px-3 py-2.5 text-center backdrop-blur sm:min-w-[100px] sm:rounded-2xl sm:px-4 sm:py-3 ${t.statCard}`}
            >
              <div className="text-xl font-black sm:text-2xl">
                {loading ? "…" : students.length}
              </div>
              <div
                className={`text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${t.statLabel}`}
              >
                In list
              </div>
            </div>
            {!hideYearFilter && (
              <div
                className={`rounded-xl px-3 py-2.5 text-center backdrop-blur sm:min-w-[100px] sm:rounded-2xl sm:px-4 sm:py-3 ${t.statCard}`}
              >
                <div className="text-xl font-black sm:text-2xl">
                  {loading ? "…" : thisYearCount}
                </div>
                <div
                  className={`text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${t.statLabel}`}
                >
                  {currentYear} EC
                </div>
              </div>
            )}
            <div
              className={`col-span-2 rounded-xl px-3 py-2.5 text-center backdrop-blur sm:col-span-1 sm:min-w-[100px] sm:rounded-2xl sm:px-4 sm:py-3 ${t.statCard}`}
            >
              <div className="text-xl font-black sm:text-2xl">
                {loading ? "…" : filtered.length}
              </div>
              <div
                className={`text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${t.statLabel}`}
              >
                Matching
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Filters
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <input
            type="search"
            placeholder="Search ID, name, grade…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-2 ring-transparent transition sm:px-4 sm:py-3 ${t.filterFocus}`}
          />
          {!hideYearFilter && (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none sm:px-4 sm:py-3 ${t.filterFocus}`}
            >
              <option value="">All academic years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none sm:px-4 sm:py-3 ${t.filterFocus}`}
          >
            <option value="">All grades</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value)}
            className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none sm:px-4 sm:py-3 ${t.filterFocus}`}
          >
            <option value="">All</option>
            {sexOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:rounded-3xl">
        <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">
            Students
            <span className="ml-2 font-normal text-gray-500">
              ({filtered.length} shown)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 sm:py-20">
            <div
              className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent sm:h-12 sm:w-12 ${t.spin}`}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 sm:py-16">
            No students match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:px-5 sm:py-3 sm:text-xs">
                    Unique ID
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:px-5 sm:py-3 sm:text-xs">
                    Name
                  </th>
                  <th className="hidden px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:table-cell sm:px-5 sm:py-3 sm:text-xs">
                    Grade
                  </th>
                  {!hideYearFilter && (
                    <th className="hidden px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 md:table-cell sm:px-5 sm:py-3 sm:text-xs">
                      Year
                    </th>
                  )}
                  <th className="hidden px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 lg:table-cell sm:px-5 sm:py-3 sm:text-xs">
                    Sex
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:px-5 sm:py-3 sm:text-xs">
                    {actionLabel}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s._id.toString()} className={t.rowHover}>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                      <span
                        className={`inline-block max-w-[8rem] truncate rounded-lg border px-2 py-1 font-mono text-[10px] font-bold sm:max-w-none sm:px-2.5 sm:text-xs ${t.pill}`}
                      >
                        {s.Unique_ID || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 sm:px-5 sm:py-3 sm:text-sm">
                      {s.First_Name} {s.Father_Name}
                      <span className="mt-0.5 block text-[10px] font-normal text-gray-500 sm:hidden">
                        {s.Grade}
                        {!hideYearFilter && ` · ${s.Academic_Year}`} · {s.Sex}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-gray-700 sm:table-cell sm:px-5 sm:py-3">
                      {s.Grade}
                    </td>
                    {!hideYearFilter && (
                      <td className="hidden px-3 py-2.5 text-gray-600 md:table-cell sm:px-5 sm:py-3">
                        {s.Academic_Year}
                      </td>
                    )}
                    <td className="hidden px-3 py-2.5 text-gray-600 lg:table-cell sm:px-5 sm:py-3">
                      {s.Sex}
                    </td>
                    <td className="px-3 py-2.5 text-right sm:px-5 sm:py-3">
                      <Link
                        href={`${basePath}/${s._id.toString()}`}
                        className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs ${t.btn}`}
                      >
                        {actionLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
