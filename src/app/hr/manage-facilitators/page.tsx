"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { User, Facilitator } from "@/lib/models";
import { exportToExcel } from "@/lib/excelExport";

const PAGE_SIZE = 10;

export default function HRFacilitators() {
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
  }, [search]);

  const handleToggleAddStudent = useCallback(
    async (id: string, currentValue: boolean) => {
      try {
        const res = await fetch(`/api/facilitators/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canAddStudent: !currentValue }),
        });
        if (!res.ok) throw new Error("Failed to update permission");
        fetchData();
      } catch (err) {
        setError("Failed to update permission");
      }
    },
    [fetchData],
  );

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
    return facilitators.filter((f) =>
      [f.name, f.email, f.role]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [facilitators, search]);

  const paged = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in zoom-in-95 duration-700 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c4a6e] via-sky-900 to-slate-900 text-white rounded-[2.5rem] p-10 sm:p-14 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 opacity-20 blur-[100px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 w-full md:w-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-md mb-3">
            Human Resources
            <br />
            Directory
          </h1>
          <p className="text-cyan-100/90 text-lg md:text-xl font-medium max-w-lg leading-relaxed">
            Oversee attendance personnel, define administrative roles, and
            provision broad student creation access.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-4 w-full md:w-auto mt-4 md:mt-0">
          <button
            className="flex-1 md:flex-none justify-center px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white font-bold transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
            onClick={() => exportToExcel(filtered, "HR_Facilitators")}
            disabled={filtered.length === 0}
          >
            Export to Excel
          </button>
          <Link
            href="/hr/manage-facilitators/add"
            className="flex-1 md:flex-none justify-center items-center text-center px-6 py-4 bg-gradient-to-r from-cyan-500 to-sky-500 rounded-2xl text-white font-black shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all text-lg"
          >
            + Onboard Staff
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border-2 border-dashed border-red-200 text-center font-semibold text-lg">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-2xl transition-all duration-300">
            <div className="w-full sm:max-w-md relative">
              <svg
                className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Rapid search staff members..."
                className="pl-12 pr-4 py-4 w-full bg-cyan-50/50 border-2 border-cyan-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-semibold text-gray-800 placeholder-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex font-semibold text-gray-500 bg-gray-50 p-2 rounded-2xl border border-gray-100 whitespace-nowrap">
              <span className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-cyan-700">
                Total Found: {filtered.length}
              </span>
            </div>
          </div>

          {/* Table View (Desktop) */}
          <div className="hidden lg:block bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-widest text-xs font-black text-gray-500">
                  <th className="p-6 w-1/4">Staff Member</th>
                  <th className="p-6">Position & Grade</th>
                  <th className="p-6 text-center">Add Student</th>
                  <th className="p-6 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((fac) => (
                  <tr
                    key={fac._id?.toString()}
                    className="hover:bg-cyan-50/30 transition-colors group"
                  >
                    <td className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-sky-100 flex items-center justify-center text-cyan-700 font-bold shadow-inner">
                        {fac.name ? fac.name.charAt(0).toUpperCase() : "-"}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {fac.name || "N/A"}
                        </p>
                        <p className="font-medium text-cyan-600 mt-0.5">
                          {fac.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col items-start gap-2">
                        <span className="inline-flex py-1 px-3 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-sm leading-none">
                          {fac.role}
                        </span>
                        <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-100">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                          {Array.isArray(fac.grade)
                            ? fac.grade.join(", ")
                            : fac.grade || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center text-center">
                        <button
                          onClick={() =>
                            handleToggleAddStudent(
                              fac._id!.toString(),
                              fac.canAddStudent ?? false,
                            )
                          }
                          className={`group/toggle relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-inner ${
                            fac.canAddStudent
                              ? "bg-gradient-to-r from-emerald-400 to-green-500"
                              : "bg-gray-200 hover:bg-gray-300"
                          }`}
                          title={
                            fac.canAddStudent
                              ? "Disable Add Student button for this facilitator"
                              : "Enable Add Student button for this facilitator"
                          }
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition-all duration-300 ${
                              fac.canAddStudent
                                ? "translate-x-7 shadow-green-500/50"
                                : "translate-x-1"
                            }`}
                          >
                            <div
                              className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${fac.canAddStudent ? "opacity-100" : "opacity-0"}`}
                            >
                              <svg
                                className="w-3.5 h-3.5 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="3"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/hr/manage-facilitators/edit/${fac._id?.toString()}`}
                          className="bg-yellow-100 hover:bg-amber-400 text-amber-700 hover:text-white font-bold p-3 rounded-xl transition-all shadow-sm hover:-translate-y-0.5"
                          title="Modify Record"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </Link>
                        <button
                          className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-bold p-3 rounded-xl transition-all shadow-sm hover:-translate-y-0.5"
                          onClick={() => handleDeleteFac(fac._id!.toString())}
                          title="Terminate Staff"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-16 text-center text-gray-500 font-medium"
                    >
                      No operational records matching search parameter{" "}
                      <span className="font-bold border-b border-gray-300">
                        &quot;{search}&quot;
                      </span>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6">
            {paged.map((fac) => (
              <div
                key={fac._id?.toString()}
                className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 flex flex-col gap-5 hover:border-cyan-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 min-w-[4rem] rounded-2xl bg-gradient-to-br from-cyan-100 to-sky-100 flex items-center justify-center text-cyan-700 text-2xl font-black shrink-0">
                    {fac.name ? fac.name.charAt(0).toUpperCase() : "-"}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 text-xl truncate pr-2">
                      {fac.name || "N/A"}
                    </h3>
                    <p className="font-bold text-sm text-cyan-600 truncate pr-2">
                      {fac.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Role
                    </p>
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">
                      {fac.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Grade Assignment
                    </p>
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">
                      {Array.isArray(fac.grade)
                        ? fac.grade.join(", ")
                        : fac.grade || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 px-2">
                  <span className="font-black text-gray-700 text-sm uppercase tracking-wide">
                    Add Student
                  </span>
                  <button
                    onClick={() =>
                      handleToggleAddStudent(
                        fac._id!.toString(),
                        fac.canAddStudent ?? false,
                      )
                    }
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      fac.canAddStudent
                        ? "bg-green-500 shadow-md shadow-green-500/40"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${fac.canAddStudent ? "translate-x-7" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                <div className="pt-5 flex gap-3 border-t border-gray-100 mt-auto">
                  <Link
                    href={`/hr/manage-facilitators/edit/${fac._id?.toString()}`}
                    className="flex-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-400 hover:text-yellow-900 font-bold py-3 text-center rounded-xl transition-colors"
                  >
                    Edit Staff
                  </Link>
                  <button
                    onClick={() => handleDeleteFac(fac._id!.toString())}
                    className="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold py-3 text-center rounded-xl transition-colors"
                  >
                    Terminate
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Component */}
          {pages > 1 && (
            <div className="flex justify-center items-center gap-3 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] w-max mx-auto shadow-sm border border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3.5 bg-gray-50 rounded-2xl hover:bg-cyan-50 text-gray-600 hover:text-cyan-700 disabled:opacity-30 flex items-center justify-center font-bold tracking-wide transition-all active:scale-95"
              >
                &larr; Previous
              </button>
              <span className="font-black text-slate-800 bg-slate-50 px-6 py-3.5 rounded-2xl border border-slate-100 text-sm shadow-inner uppercase tracking-widest">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-3.5 bg-gray-50 rounded-2xl hover:bg-cyan-50 text-gray-600 hover:text-cyan-700 disabled:opacity-30 flex items-center justify-center font-bold tracking-wide transition-all active:scale-95"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
