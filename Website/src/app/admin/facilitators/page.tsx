"use client";
import { useEffect, useState } from "react";
const PAGE_SIZE = 10;
const ROLE_LABELS: { [key: string]: string } = {
  'facilitator1': 'Attendance Facilitator',
  'facilitator2': 'Education Facilitator',
  'Attendance Facilitator': 'Attendance Facilitator',
  'Education Facilitator': 'Education Facilitator',
};
const ROLE_VALUES = [
  { value: 'Attendance Facilitator', label: 'Attendance Facilitator' },
  { value: 'Education Facilitator', label: 'Education Facilitator' },
];
function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
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
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editFac, setEditFac] = useState<any | null>(null);
  const [facForm, setFacForm] = useState({ name: "", email: "", password: "", role: "Attendance Facilitator" });
  const [facFormError, setFacFormError] = useState<string | null>(null);
  const [facFormLoading, setFacFormLoading] = useState(false);
  useEffect(() => {
    fetchData();
  }, []);
  function fetchData() {
    setLoading(true);
    fetch("/api/facilitators")
      .then((res) => res.json())
      .then((data) => {
        setFacilitators(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load facilitators");
        setLoading(false);
      });
  }
  function openModal(fac: any = null) {
    setEditFac(fac);
    setFacForm(fac ? { name: fac.name || "", email: fac.email, password: "", role: fac.role } : { name: "", email: "", password: "", role: "Attendance Facilitator" });
    setFacFormError(null);
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditFac(null);
    setFacForm({ name: "", email: "", password: "", role: "Attendance Facilitator" });
    setFacFormError(null);
  }
  async function handleFacFormSubmit(e: any) {
    e.preventDefault();
    setFacFormLoading(true);
    setFacFormError(null);
    const method = editFac ? "PUT" : "POST";
    const body = editFac ? { ...facForm, id: editFac._id } : facForm;
    const res = await fetch("/api/facilitators", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      closeModal();
      fetchData();
    } else {
      const data = await res.json();
      setFacFormError(data.error || "Failed to save facilitator");
    }
    setFacFormLoading(false);
  }
  async function handleDeleteFac(id: string) {
    if (!confirm("Are you sure you want to delete this facilitator?")) return;
    setFacFormLoading(true);
    const res = await fetch("/api/facilitators", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchData();
    setFacFormLoading(false);
  }
  const filtered = facilitators.filter((f) =>
    [f.name, f.email, f.role].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-900">Manage Facilitators</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          onClick={() => exportToCSV(filtered, "facilitators.csv")}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 ml-2"
          onClick={() => openModal()}
        >
          + Add Facilitator
        </button>
      </div>
      <input
        type="text"
        placeholder="Search facilitators..."
        className="mb-4 p-2 border rounded w-full max-w-xs"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />
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
              {paged.map((fac: any) => (
                <tr key={fac._id} className="hover:bg-gray-50">
                  <td className="border p-3">{fac.name || "-"}</td>
                  <td className="border p-3">{fac.email}</td>
                  <td className="border p-3 capitalize">{ROLE_LABELS[String(fac.role)] || fac.role}</td>
                  <td className="border p-3 flex gap-2">
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      onClick={() => openModal(fac)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDeleteFac(fac._id)}
                      disabled={facFormLoading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex gap-2 mt-4 justify-center">
            <button
              className="px-3 py-1 rounded border bg-gray-100"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="px-2">Page {page} of {pages}</span>
            <button
              className="px-3 py-1 rounded border bg-gray-100"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {/* Modal for Add/Edit Facilitator */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={closeModal}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">{editFac ? "Edit Facilitator" : "Add Facilitator"}</h3>
            <form onSubmit={handleFacFormSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Name"
                className="p-3 border rounded-lg"
                value={facForm.name}
                onChange={(e) => setFacForm({ ...facForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="p-3 border rounded-lg"
                value={facForm.email}
                onChange={(e) => setFacForm({ ...facForm, email: e.target.value })}
                required
                disabled={!!editFac}
              />
              <input
                type="password"
                placeholder={editFac ? "New Password (leave blank to keep)" : "Password"}
                className="p-3 border rounded-lg"
                value={facForm.password}
                onChange={(e) => setFacForm({ ...facForm, password: e.target.value })}
                minLength={editFac ? 0 : 6}
                required={!editFac}
              />
              <select
                className="p-3 border rounded-lg"
                value={facForm.role}
                onChange={(e) => setFacForm({ ...facForm, role: e.target.value })}
                required
              >
                {ROLE_VALUES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {facFormError && <div className="text-red-500 text-sm">{facFormError}</div>}
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={facFormLoading}
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