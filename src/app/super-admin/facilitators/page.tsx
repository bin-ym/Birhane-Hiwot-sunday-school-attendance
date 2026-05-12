// src/app/super-admin/facilitators/page.tsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { User } from "@/lib/models";

const PAGE_SIZE = 10;
const ROLE_VALUES = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
];

function exportToCSV(data: User[], filename: string) {
  if (!data.length) return;
  const headers = ["Name", "Email", "Role"];
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      [
        `"${(row.name || "-").replace(/"/g, '""')}"`,
        `"${row.email.replace(/"/g, '""')}"`,
        `"${row.role.replace(/"/g, '""')}"`,
      ].join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFacilitators() {
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"attendance" | "education">(
    "attendance",
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facilitators");
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setFacilitators(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Failed to load facilitators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [facilitators.length]);

  const handleDeleteFac = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this facilitator?")) return;
      try {
        const res = await fetch("/api/facilitators", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Failed to delete facilitator");
        fetchData();
      } catch (err) {
        setError("Failed to delete facilitator");
      }
    },
    [fetchData],
  );

  const filtered = useMemo(() => {
    return facilitators.filter((f) => {
      if (activeTab === "attendance" && f.role !== "Attendance Facilitator")
        return false;
      if (activeTab === "education" && f.role !== "Education Facilitator")
        return false;
      return [f.name, f.email, f.role]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [facilitators, search, activeTab]);

  const paged = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in relative z-10 w-full pb-20">
      {/* Header Section */}
      <div className="flex justify-between items-end border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            Global Facilitators
          </h2>
          <p className="text-sm text-gray-500 font-light mt-1 max-w-xl">
            Cross-departmental view and management interface for resolving
            systemic facilitator queries across the ecosystem.
          </p>
        </div>
        <div className="hidden sm:flex gap-3">
          <button
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-xl transition-all hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:outline-none disabled:opacity-50"
            onClick={() => exportToCSV(filtered, "facilitators.csv")}
            disabled={filtered.length === 0}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            Export
          </button>
          <Link
            href="/super-admin/facilitators/add"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Add New
          </Link>
        </div>
      </div>

      {/* Mobile Top Actions */}
      <div className="sm:hidden flex gap-2">
        <button
          className="flex-1 flex justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-3 rounded-xl transition-all active:bg-gray-50"
          onClick={() => exportToCSV(filtered, "facilitators.csv")}
        >
          Export
        </button>
        <Link
          href="/super-admin/facilitators/add"
          className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-4 py-3 rounded-xl shadow-md"
        >
          Add New
        </Link>
      </div>

      {/* Filters Stack */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-2xl opacity-60"></div>

        {/* Animated Pills */}
        <div className="relative z-10 flex gap-2 p-1 bg-gray-100 rounded-2xl w-max">
          <button
            onClick={() => {
              setActiveTab("attendance");
              setPage(1);
            }}
            className={`relative px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === "attendance" ? "text-indigo-600 bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Attendance Teams
          </button>
          <button
            onClick={() => {
              setActiveTab("education");
              setPage(1);
            }}
            className={`relative px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === "education" ? "text-emerald-600 bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Education Teams
          </button>
        </div>

        <div className="relative z-10 w-full md:max-w-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm transition-all outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center font-medium">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <svg
                className="w-16 h-16 text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <span className="text-lg font-medium">No facilitators found</span>
              <p className="text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paged.map((fac) => (
                  <div
                    key={fac._id?.toString()}
                    className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group flex flex-col relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 w-full h-1.5 left-0 ${activeTab === "attendance" ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`}
                    ></div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-inner ${activeTab === "attendance" ? "bg-indigo-500" : "bg-emerald-500"}`}
                        >
                          {fac.name ? fac.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-lg">
                            {fac.name || "Unnamed User"}
                          </h3>
                          <p
                            className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${activeTab === "attendance" ? "text-indigo-500" : "text-emerald-500"}`}
                          >
                            {fac.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-6 flex-1">
                      <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            ></path>
                          </svg>
                        </div>
                        <span className="truncate font-medium">
                          {fac.email}
                        </span>
                      </div>

                      {activeTab !== "education" && (
                        <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                          <span className="block mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Assigned Scopes
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(fac.grade) &&
                            fac.grade.length > 0 ? (
                              fac.grade.map((g) => (
                                <span
                                  key={g}
                                  className="px-2.5 py-1 bg-white text-indigo-700 rounded-lg border border-indigo-100 text-xs font-bold shadow-sm"
                                >
                                  {g}
                                </span>
                              ))
                            ) : (
                              <span className="px-2.5 py-1 bg-white text-gray-500 rounded-lg border border-gray-200 text-xs font-bold shadow-sm">
                                {fac.grade || "Unassigned"}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                      <Link
                        href={`/super-admin/facilitators/edit/${fac._id?.toString()}`}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-sm font-bold rounded-xl transition-all shadow-sm"
                      >
                        Configure
                      </Link>
                      <button
                        onClick={() => handleDeleteFac(fac._id!.toString())}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-colors border border-red-100 shadow-sm"
                      >
                        Revoke Team
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Showing{" "}
                <span className="text-gray-900 font-bold">
                  {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
                </span>{" "}
                to{" "}
                <span className="text-gray-900 font-bold">
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="text-gray-900 font-bold">
                  {filtered.length}
                </span>{" "}
                entries
              </span>
              <div className="flex gap-2">
                <button
                  className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                </button>
                <button
                  className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
