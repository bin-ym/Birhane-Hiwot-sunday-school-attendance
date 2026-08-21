"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import {
  Download,
  Users,
  TrendingUp,
  Calendar,
  BookOpen,
  UserCheck,
  GraduationCap,
  FileSpreadsheet,
} from "lucide-react";

// ─── Animated Counter ────────────────────────────────────────────────

export function AnimatedCounter({
  value,
  duration = 1200,
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    // Only animate once on mount (started ref prevents re-animation if value changes)
    if (started.current) return;
    started.current = true;

    const startTime = performance.now();
    const target = value;
    let frameId: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smoother deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

// ─── Icon picker for common stat labels ─────────────────────────────

function statIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("student")) return <Users className="h-5 w-5" />;
  if (l.includes("teacher") || l.includes("facilitator") || l.includes("staff"))
    return <GraduationCap className="h-5 w-5" />;
  if (l.includes("attendance") || l.includes("present") || l.includes("rate"))
    return <UserCheck className="h-5 w-5" />;
  if (l.includes("result") || l.includes("row"))
    return <BookOpen className="h-5 w-5" />;
  if (l.includes("subject"))
    return <FileSpreadsheet className="h-5 w-5" />;
  if (l.includes("male")) return <Users className="h-5 w-5" />;
  if (l.includes("female")) return <Users className="h-5 w-5" />;
  return <TrendingUp className="h-5 w-5" />;
}

function statIconColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("student")) return "bg-blue-100 text-blue-600";
  if (l.includes("teacher") || l.includes("facilitator") || l.includes("staff"))
    return "bg-emerald-100 text-emerald-600";
  if (l.includes("attendance") || l.includes("present") || l.includes("rate"))
    return "bg-amber-100 text-amber-600";
  if (l.includes("result") || l.includes("row"))
    return "bg-indigo-100 text-indigo-600";
  if (l.includes("subject"))
    return "bg-violet-100 text-violet-600";
  if (l.includes("male")) return "bg-sky-100 text-sky-600";
  if (l.includes("female")) return "bg-pink-100 text-pink-600";
  return "bg-gray-100 text-gray-600";
}

// ─── Main layout ────────────────────────────────────────────────────

export function ReportPageLayout({
  badge,
  title,
  subtitle,
  heroGradient,
  children,
}: {
  badge: string;
  title: string;
  subtitle: string;
  /** Tailwind gradient utility fragment, e.g. `from-slate-900 to-blue-900` */
  heroGradient: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-20 pt-2 sm:space-y-8 sm:px-6 lg:px-8">
      <header
        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl shadow-black/10 transition-shadow duration-500 hover:shadow-2xl hover:shadow-black/20 sm:rounded-3xl sm:p-8 lg:p-10 ${heroGradient}`}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-white/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 animate-pulse rounded-full bg-white/[0.06] blur-3xl" style={{ animationDelay: "1.5s" }} />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 animate-pulse rounded-full bg-white/[0.04] blur-2xl" style={{ animationDelay: "3s" }} />

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            {badge}
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {subtitle}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

// ─── Stat grid ───────────────────────────────────────────────────────

export function ReportStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      {children}
    </div>
  );
}

// ─── Animated stat card ─────────────────────────────────────────────

export function ReportStatCard({
  label,
  value,
  hint,
  valueClassName = "text-gray-900",
  animate = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
  animate?: boolean;
}) {
  const isNumeric =
    animate &&
    typeof value === "number";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
      {/* Accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current opacity-0 transition-opacity duration-300 group-hover:opacity-30" />

      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
          {label}
        </p>
        <div
          className={`-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${statIconColor(label)} transition-transform duration-300 group-hover:scale-110`}
        >
          {statIcon(label)}
        </div>
      </div>
      <p
        className={`mt-2 text-3xl font-black tabular-nums sm:text-4xl ${valueClassName}`}
      >
        {isNumeric ? (
          <AnimatedCounter value={value as number} />
        ) : (
          value
        )}
      </p>
      {hint ? (
        <p className="mt-2 flex items-center gap-1 text-xs leading-snug text-gray-500 sm:text-sm">
          <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────

export function ReportSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:rounded-3xl sm:p-8 ${className}`}
    >
      {/* Subtle top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 sm:mb-6 sm:text-xl">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gray-400 to-gray-300" />
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Premium Export Button ───────────────────────────────────────────

export function ExportButton({
  onClick,
  disabled,
  label,
  icon,
  color = "indigo",
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  icon?: ReactNode;
  color?: "indigo" | "emerald" | "blue" | "violet" | "gray";
}) {
  const colorMap: Record<string, string> = {
    indigo:
      "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-200 active:shadow-indigo-300",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-200 active:shadow-emerald-300",
    blue:
      "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-200 active:shadow-blue-300",
    violet:
      "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-200 active:shadow-violet-300",
    gray:
      "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 active:shadow-sm",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 ${colorMap[color]}`}
    >
      {icon ?? (
        <Download className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────

export function ProgressBar({
  value,
  max,
  color = "emerald",
  showLabel = true,
}: {
  value: number;
  max: number;
  color?: "emerald" | "amber" | "blue" | "violet" | "red" | "indigo";
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    red: "bg-red-500",
    indigo: "bg-indigo-500",
  };
  const bgColor: Record<string, string> = {
    emerald: "bg-emerald-100",
    amber: "bg-amber-100",
    blue: "bg-blue-100",
    violet: "bg-violet-100",
    red: "bg-red-100",
    indigo: "bg-indigo-100",
  };

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {value} / {max}
          </span>
          <span className="font-bold text-gray-900">{pct}%</span>
        </div>
      )}
      <div
        className={`h-3 overflow-hidden rounded-full ${bgColor[color]} shadow-inner`}
      >
        <div
          className={`h-full rounded-full ${barColor[color]} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Donut chart (SVG ring) ──────────────────────────────────────────

export function DonutChart({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color = "#10b981",
  bgColor = "#e5e7eb",
  label,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-sm">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 text-lg font-black tabular-nums"
        >
          {pct}%
        </text>
      </svg>
      {label && (
        <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
      )}
    </div>
  );
}

// ─── Report Filter Bar ────────────────────────────────────────────────

const ACADEMIC_YEARS = (() => {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - 10; y <= current + 2; y++) {
    const ecYear = y - 7;
    years.push(`${ecYear}`);
  }
  return years;
})();

export function ReportFilters({
  grades,
  onFilter,
  showAcademicYear = true,
  showGrade = true,
  showDateRange = true,
}: {
  grades: { value: string; label: string }[];
  onFilter: (filters: { academicYear?: string; grade?: string; dateFrom?: string; dateTo?: string }) => void;
  showAcademicYear?: boolean;
  showGrade?: boolean;
  showDateRange?: boolean;
}) {
  const [academicYear, setAcademicYear] = useState("");
  const [grade, setGrade] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleApply = () => {
    onFilter({
      academicYear: academicYear || undefined,
      grade: grade || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleReset = () => {
    setAcademicYear("");
    setGrade("");
    setDateFrom("");
    setDateTo("");
    onFilter({});
  };

  const hasActive = academicYear || grade || dateFrom || dateTo;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        {showAcademicYear && (
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All years</option>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {showGrade && (
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
              Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All grades</option>
              {grades.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDateRange && (
          <>
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
                From date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
                To date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-500 active:translate-y-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Apply
          </button>
          {hasActive && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 active:translate-y-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
      {icon ?? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 ${className}`}
    />
  );
}
