"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { User } from "@/lib/models";
import { exportToExcel } from "@/lib/excelExport";

const PAGE_SIZE = 10;

export default function EducationFacilitators() {
  const [facilitators, setFacilitators] = useState<User[]>([]);
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
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-[2.5rem] p-10 sm:p-14 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-20 blur-[100px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 w-full md:w-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-md mb-3">
            Education
            <br />
            Facilitators
          </h1>
          <p className="text-blue-200/90 text-lg md:text-xl font-medium max-w-md">
            Manage system access, oversee roles, and maintain registry of
            administrative staff.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-4 w-full md:w-auto mt-4 md:mt-0">
          <button
            className="flex-1 md:flex-none justify-center px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white font-bold transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
            onClick={() => exportToExcel(filtered, "Education_Facilitators")}
            disabled={filtered.length === 0}
          >
            Export Directory
          </button>
          <Link
            href="/education/manage-facilitators/add"
            className="flex-1 md:flex-none justify-center items-center text-center px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl text-white font-black shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all text-lg"
          >
            + Add User
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
          <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:max-w-md relative">
              <svg
                className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
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
                placeholder="Search name, email, or role..."
                className="pl-12 pr-4 py-4 w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-gray-800 placeholder-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex font-semibold text-gray-500 bg-gray-50 p-2 rounded-2xl border border-gray-100 whitespace-nowrap">
              <span className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-700">
                Total: {filtered.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="hidden lg:block bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-widest text-xs font-black text-gray-500">
                  <th className="p-6 w-1/3">Facilitator Profile</th>
                  <th className="p-6 w-1/4">Role Designation</th>
                  <th className="p-6 text-right rounded-tr-[2rem]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((fac) => (
                  <tr
                    key={fac._id?.toString()}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold shadow-inner">
                        {fac.name ? fac.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {fac.name || "Unknown User"}
                        </p>
                        <p className="font-medium text-gray-500 mt-0.5">
                          {fac.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="inline-flex py-1.5 px-3 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                        {fac.role}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                        <Link
                          href={`/education/manage-facilitators/edit/${fac._id?.toString()}`}
                          className="bg-yellow-100 hover:bg-yellow-500 text-yellow-700 hover:text-white font-bold p-3 rounded-xl transition-colors shadow-sm"
                          title="Edit Facilitator"
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
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </Link>
                        <button
                          className="bg-red-100 hover:bg-red-500 text-red-700 hover:text-white font-bold p-3 rounded-xl transition-colors shadow-sm"
                          onClick={() => handleDeleteFac(fac._id!.toString())}
                          title="Delete Facilitator"
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
                      colSpan={3}
                      className="p-16 text-center text-gray-500 font-medium"
                    >
                      No match found for{" "}
                      <span className="font-bold">&quot;{search}&quot;</span>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
            {paged.map((fac) => (
              <div
                key={fac._id?.toString()}
                className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 text-xl font-bold">
                    {fac.name ? fac.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 text-xl truncate">
                      {fac.name || "Unknown"}
                    </h3>
                    <p className="font-medium text-gray-500 truncate">
                      {fac.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase">
                    {fac.role}
                  </span>
                </div>
                <div className="mt-auto pt-4 flex gap-3">
                  <Link
                    href={`/education/manage-facilitators/edit/${fac._id?.toString()}`}
                    className="flex-1 bg-yellow-100 text-yellow-700 font-bold py-3 text-center rounded-xl"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteFac(fac._id!.toString())}
                    className="flex-1 bg-red-100 text-red-700 font-bold py-3 text-center rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center items-center gap-4 bg-white p-4 rounded-3xl w-max mx-auto shadow-sm border border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3 bg-gray-50 rounded-xl hover:bg-blue-50 text-gray-600 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-gray-50 font-black transition-colors"
              >
                &larr; Prev
              </button>
              <span className="font-black text-gray-800 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-3 bg-gray-50 rounded-xl hover:bg-blue-50 text-gray-600 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-gray-50 font-black transition-colors"
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
