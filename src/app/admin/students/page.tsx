"use client";
import { useEffect, useState } from "react";
const PAGE_SIZE = 10;
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
export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setLoading(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load students");
        setLoading(false);
      });
  }, []);
  const filtered = students.filter((s) =>
    [s.Unique_ID, s.First_Name, s.Father_Name, s.Grade, s.Sex, s.Phone_Number, s.Academic_Year].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-blue-900">Manage Students</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          onClick={() => exportToCSV(filtered, "students.csv")}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>
      <input
        type="text"
        placeholder="Search students..."
        className="mb-4 p-2 border rounded w-full max-w-xs"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />
      {loading ? (
        <div className="text-gray-500">Loading students...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">ID Number</th>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Grade</th>
                <th className="border p-3 text-left">Sex</th>
                <th className="border p-3 text-left">Phone</th>
                <th className="border p-3 text-left">Academic Year</th>
                {/* Add more columns as needed */}
              </tr>
            </thead>
            <tbody>
              {paged.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="border p-3">{student.Unique_ID}</td>
                  <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                  <td className="border p-3">{student.Grade}</td>
                  <td className="border p-3">{student.Sex}</td>
                  <td className="border p-3">{student.Phone_Number}</td>
                  <td className="border p-3">{student.Academic_Year}</td>
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
    </div>
  );
} 