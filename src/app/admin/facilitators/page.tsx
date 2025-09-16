// src/app/admin/facilitators/page.tsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link"; // 👈 ADD THIS
import { User } from "@/lib/models";

const PAGE_SIZE = 10;
const ROLE_VALUES = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
  // { value: "Education Facilitator", label: "Education Facilitator" },
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
      ].join(",")
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

  // 👇 REMOVE ALL MODAL STATE HOOKS
  // const [showModal, ...] → DELETED

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

  // 👇 REMOVE openModal, closeModal

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
    [fetchData]
  );

  const filtered = useMemo(() => {
    return facilitators.filter((f) =>
      [f.name, f.email, f.role]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [facilitators, search]);

  const paged = useMemo(() => {
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col gap-8 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-900">
          Manage Facilitators
        </h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            onClick={() => exportToCSV(filtered, "facilitators.csv")}
            disabled={filtered.length === 0}
            aria-label="Export facilitators to CSV"
          >
            Export CSV
          </button>
          {/* 👇 CHANGE TO LINK */}
          <Link
            href="/admin/facilitators/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            aria-label="Add new facilitator"
          >
            + Add Facilitator
          </Link>
        </div>
      </div>
      <label className="flex flex-col max-w-xs">
        <span className="text-sm font-medium">Search Facilitators</span>
        <input
          type="text"
          placeholder="Search facilitators..."
          className="p-2 border rounded w-full"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search facilitators"
        />
      </label>
      {loading ? (
        <div className="text-gray-500">Loading facilitators...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Email</th>
                <th className="border p-3 text-left">Role</th>
                <th className="border p-3 text-left">Grade</th>
                <th className="border p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((fac) => (
                <tr key={fac._id?.toString()} className="hover:bg-gray-50">
                  <td className="border p-3">{fac.name || "-"}</td>
                  <td className="border p-3">{fac.email}</td>
                  <td className="border p-3 capitalize">{fac.role}</td>
                  <td className="border p-3">
                    {Array.isArray(fac.grade)
                      ? fac.grade.join(", ")
                      : fac.grade || "-"}
                  </td>
                  <td className="border p-3 flex gap-2">
                    {/* 👇 EDIT AS LINK */}
                    <Link
                      href={`/admin/facilitators/edit/${fac._id?.toString()}`}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      aria-label={`Edit ${fac.name || "facilitator"}`}
                    >
                      Edit
                    </Link>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDeleteFac(fac._id!.toString())}
                      aria-label={`Delete ${fac.name || "facilitator"}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-4 justify-center">
            <button
              className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              Prev
            </button>
            <span className="px-2">
              Page {page} of {pages}
            </span>
            <button
              className="px-3 py-1 rounded border bg-gray-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
