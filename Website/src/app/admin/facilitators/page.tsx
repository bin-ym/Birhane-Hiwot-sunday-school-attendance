"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { User } from "@/lib/models";

const PAGE_SIZE = 10;
const ROLE_VALUES = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
  { value: "Education Facilitator", label: "Education Facilitator" },
];

interface FacForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

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
  const [showModal, setShowModal] = useState(false);
  const [editFac, setEditFac] = useState<User | null>(null);
  const [facForm, setFacForm] = useState<FacForm>({ name: "", email: "", password: "", role: "Attendance Facilitator" });
  const [facFormError, setFacFormError] = useState<string | null>(null);
  const [facFormLoading, setFacFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facilitators");
      console.log("API Response Status:", res.status);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      console.log("API Response Data:", data);
      setFacilitators(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Failed to load facilitators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("Fetching facilitators...");
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1); // Reset page when facilitators change
  }, [facilitators.length]);

  function openModal(fac: User | null = null) {
    setEditFac(fac);
    setFacForm(
      fac
        ? { name: fac.name || "", email: fac.email, password: "", role: fac.role }
        : { name: "", email: "", password: "", role: "Attendance Facilitator" }
    );
    setFacFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditFac(null);
    setFacForm({ name: "", email: "", password: "", role: "Attendance Facilitator" });
    setFacFormError(null);
  }

  const handleFacFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFacFormLoading(true);
      setFacFormError(null);
      try {
        const method = editFac ? "PUT" : "POST";
        const body = editFac ? { ...facForm, id: editFac._id } : facForm;
        console.log("Submitting form:", body, "Method:", method);
        const res = await fetch("/api/facilitators", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save facilitator");
        }
        closeModal();
        fetchData();
      } catch (err) {
        console.error("Form Submit Error:", err);
        setFacFormError((err as Error).message);
      } finally {
        setFacFormLoading(false);
      }
    },
    [editFac, fetchData]
  );

  const handleDeleteFac = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this facilitator?")) return;
      setFacFormLoading(true);
      try {
        console.log("Deleting facilitator:", id);
        const res = await fetch("/api/facilitators", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Failed to delete facilitator");
        fetchData();
      } catch (err) {
        console.error("Delete Error:", err);
        setError("Failed to delete facilitator");
      } finally {
        setFacFormLoading(false);
      }
    },
    [fetchData]
  );

  const filtered = useMemo(() => {
    const result = facilitators.filter((f) =>
      [f.name, f.email, f.role].join(" ").toLowerCase().includes(search.toLowerCase())
    );
    console.log("Filtered Facilitators:", result);
    return result;
  }, [facilitators, search]);

  const paged = useMemo(() => {
    const result = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    console.log("Paged Facilitators:", result);
    return result;
  }, [filtered, page]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col gap-8 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-900">Manage Facilitators</h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            onClick={() => exportToCSV(filtered, "facilitators.csv")}
            disabled={filtered.length === 0}
            aria-label="Export facilitators to CSV"
          >
            Export CSV
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => openModal()}
            aria-label="Add new facilitator"
          >
            + Add Facilitator
          </button>
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
                <th className="border p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((fac) => (
                <tr key={fac._id} className="hover:bg-gray-50">
                  <td className="border p-3">{fac.name || "-"}</td>
                  <td className="border p-3">{fac.email}</td>
                  <td className="border p-3 capitalize">{fac.role}</td>
                  <td className="border p-3 flex gap-2">
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      onClick={() => openModal(fac)}
                      aria-label={`Edit ${fac.name || "facilitator"}`}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDeleteFac(fac._id!)}
                      disabled={facFormLoading}
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
            <span className="px-2">Page {page} of {pages}</span>
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
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">{editFac ? "Edit Facilitator" : "Add Facilitator"}</h3>
            <form onSubmit={handleFacFormSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium">Name</span>
                <input
                  type="text"
                  placeholder="Name"
                  className="p-3 border rounded-lg"
                  value={facForm.name}
                  onChange={(e) => setFacForm({ ...facForm, name: e.target.value })}
                  required
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Email</span>
                <input
                  type="email"
                  placeholder="Email"
                  className="p-3 border rounded-lg"
                  value={facForm.email}
                  onChange={(e) => setFacForm({ ...facForm, email: e.target.value })}
                  required
                  disabled={!!editFac}
                  aria-required="true"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Password</span>
                <input
                  type="password"
                  placeholder={editFac ? "New Password (leave blank to keep)" : "Password"}
                  className="p-3 border rounded-lg"
                  value={facForm.password}
                  onChange={(e) => setFacForm({ ...facForm, password: e.target.value })}
                  minLength={editFac ? 0 : 6}
                  required={!editFac}
                  aria-required={!editFac}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium">Role</span>
                <select
                  className="p-3 border rounded-lg"
                  value={facForm.role}
                  onChange={(e) => setFacForm({ ...facForm, role: e.target.value })}
                  required
                  aria-required="true"
                >
                  {ROLE_VALUES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              {facFormError && <div className="text-red-500 text-sm">{facFormError}</div>}
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={facFormLoading}
                aria-label={editFac ? "Update facilitator" : "Add facilitator"}
              >
                {facFormLoading ? "Saving..." : editFac ? "Update Facilitator" : "Add Facilitator"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}