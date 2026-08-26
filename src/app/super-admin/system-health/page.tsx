"use client";

import useSWR from "swr";
import {
  Activity,
  Database,
  HardDrive,
  Clock,
  FileText,
  Bell,
  CheckCircle,
  AlertTriangle,
  Server,
} from "lucide-react";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch health data");
  return res.json();
};

export default function SystemHealthPage() {
  const { data, error, isLoading } = useSWR("/api/health", fetcher, {
    refreshInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm text-red-700">
            Failed to load system health data. {error?.message}
          </p>
        </div>
      </div>
    );
  }

  const isHealthy = data.status === "healthy";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            System Health
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time monitoring of database, API, and platform status.
          </p>
        </div>
        <Link
          href="/super-admin/dashboard"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-2xl border p-4 sm:p-6 ${
          isHealthy
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-3">
          {isHealthy ? (
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <p
              className={`text-lg font-bold ${
                isHealthy ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {isHealthy ? "All Systems Operational" : "System Degraded"}
            </p>
            <p className="text-xs text-gray-500">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Server className="h-5 w-5 text-indigo-600" />}
          label="Database"
          value={data.database?.name || "—"}
          sub={`Connected: ${data.database?.connected ? "Yes" : "No"}`}
          color="indigo"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-emerald-600" />}
          label="Uptime"
          value={data.uptime || "—"}
          sub="Server process"
          color="emerald"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-amber-600" />}
          label="Actions (24h)"
          value={data.activity?.recentActions24h ?? "—"}
          sub="Audit log entries"
          color="amber"
        />
        <StatCard
          icon={<Bell className="h-5 w-5 text-rose-600" />}
          label="Unread Notifications"
          value={data.activity?.unreadNotifications ?? "—"}
          sub="Pending alerts"
          color="rose"
        />
      </div>

      {/* Database Size */}
      {data.database?.sizeMB !== undefined && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <HardDrive className="h-5 w-5 text-gray-400" />
            Database Size
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Data Size</p>
              <p className="text-lg font-bold text-gray-900">
                {data.database.sizeMB} MB
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Storage Size</p>
              <p className="text-lg font-bold text-gray-900">
                {data.database.storageMB} MB
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Index Size</p>
              <p className="text-lg font-bold text-gray-900">
                {data.database.indexSizeMB} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collection Sizes */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Database className="h-5 w-5 text-gray-400" />
          Collection Document Counts
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Collection
                </th>
                <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider text-gray-400">
                  Documents
                </th>
                <th className="hidden pb-2 text-right text-xs font-bold uppercase tracking-wider text-gray-400 sm:table-cell">
                  Bar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(data.collections || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([name, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(data.collections as Record<string, number>).filter(
                      (v) => typeof v === "number" && v >= 0,
                    ) as number[],
                    1,
                  );
                  const pct = typeof count === "number" && count >= 0
                    ? Math.round((count / maxCount) * 100)
                    : 0;
                  return (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="py-2.5 font-mono text-xs font-medium text-gray-700">
                        {name}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">
                        {typeof count === "number" && count >= 0
                          ? count.toLocaleString()
                          : "Error"}
                      </td>
                      <td className="hidden py-2.5 text-right sm:table-cell">
                        <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Quick View */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <FileText className="h-5 w-5 text-gray-400" />
            Recent Audit Activity
          </h2>
          <Link
            href="/super-admin/audit-logs"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View All →
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {data.activity?.recentActions24h ?? 0} actions logged in the last 24 hours.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl bg-${color}-50 p-2.5`}>{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-xl font-black text-gray-900">{value}</p>
          <p className="text-[11px] text-gray-500">{sub}</p>
        </div>
      </div>
    </div>
  );
}
