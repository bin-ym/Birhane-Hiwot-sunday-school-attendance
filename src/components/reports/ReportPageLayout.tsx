"use client";

import { ReactNode } from "react";

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
    <div className="mx-auto w-full max-w-7xl animate-fade-in space-y-6 px-4 pb-20 pt-2 sm:space-y-8 sm:px-6 lg:px-8">
      <header
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl sm:rounded-3xl sm:p-8 lg:p-10 ${heroGradient}`}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 sm:text-xs">
            {badge}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            {subtitle}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

export function ReportStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function ReportStatCard({
  label,
  value,
  hint,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-black tabular-nums sm:text-4xl ${valueClassName}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-snug text-gray-500 sm:text-sm">{hint}</p>
      ) : null}
    </div>
  );
}

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
      className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8 ${className}`}
    >
      <h2 className="mb-4 text-lg font-bold text-gray-900 sm:mb-6 sm:text-xl">
        {title}
      </h2>
      {children}
    </section>
  );
}
