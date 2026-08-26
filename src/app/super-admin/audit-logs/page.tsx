"use client";

import useSWR from "swr";
import { Shield, Filter } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
};

export default function AuditLogsPage() {
  const [collection, setCollection] = useState("");
  const [action, setAction] = useState("");

  const params = new URLSearchParams();
  if (collection) params.set("collection", collection);
  if (action) params.set("action", action);
  params.set("limit", "100");

  const { data, error, isLoading } = useSWR(
    `/api/audit-logs?${params.toString()}`,
    fetcher,
    { refreshInterval: 30_000 },
  );

  const actionColor: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
    login: "bg-purple-100 text-purple-700",
    export: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all mutations across the platform — who did what and when.
          </p>
        </div>
        <Link
          href="/super-admin/dashboard"
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
        >
          ← Back
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All collections</option>
            <option value="students">Students</option>
            <option value="attendance">Attendance</option>
            <option value="users">Users</option>
            <option value="payment_status">Payments</option>
            <option value="student_requests">Requests</option>
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            <Shield className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2">No audit logs found with these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Time
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Collection
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Summary
                  </th>
                  <th className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 md:table-cell">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          actionColor[log.action] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                      {log.collection}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-xs truncate">
                      {log.summary}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-gray-500 md:table-cell">
                      {log.userEmail || log.userId}
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
