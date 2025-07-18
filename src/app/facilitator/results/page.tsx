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
export default function ResultsFacilitator() {
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/results").then((res) => res.json()),
    ]).then(([s, r]) => {
      setStudents(Array.isArray(s) ? s : []);
      setResults(Array.isArray(r) ? r : []);
      setLoading(false);
    });
  }, []);
  function updateResult(studentId: string, value: string) {
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.studentId === studentId);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], value };
        return updated;
      } else {
        return [...prev, { studentId, value }];
      }
    });
  }
  function handleExport() {
    exportToCSV(results, "results.csv");
  }
  const filtered = students.filter((s) =>
    [s.Unique_ID, s.First_Name, s.Father_Name, s.Grade, s.Sex].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-green-900">Results Dashboard</h1>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" onClick={handleExport}>Export Results</button>
      </div>
      <input
        type="text"
        placeholder="Search students..."
        className="mb-4 p-2 border rounded w-full max-w-xs"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">ID Number</th>
                <th className="border p-3 text-left">Name</th>
                <th className="border p-3 text-left">Grade</th>
                <th className="border p-3 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((student) => {
                const res = results.find((r) => r.studentId === student._id);
                return (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="border p-3">{student.Unique_ID}</td>
                    <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                    <td className="border p-3">{student.Grade}</td>
                    <td className="border p-3">
                      <input
                        type="text"
                        value={res?.value || ""}
                        onChange={(e) => updateResult(student._id, e.target.value)}
                        className="p-2 border rounded w-32"
                      />
                    </td>
                  </tr>
                );
              })}
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