"use client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
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
export default function AttendanceFacilitator() {
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importError, setImportError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/attendance").then((res) => res.json()),
    ]).then(([s, a]) => {
      setStudents(Array.isArray(s) ? s : []);
      setAttendance(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);
  // Mark attendance logic
  function markAttendance(studentId: string, present: boolean) {
    setAttendance((prev) => {
      const idx = prev.findIndex((a) => a.studentId === studentId);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], present };
        return updated;
      } else {
        return [...prev, { studentId, present }];
      }
    });
  }
  // Import from Google Sheets (XLSX)
  function handleImport(e: any) {
    setImportError(null);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        // Assume columns: studentId, present
        setAttendance((prev) => {
          const imported = rows.map((r: any) => ({ studentId: r.studentId, present: !!r.present }));
          // Merge with existing
          const merged = [...prev];
          imported.forEach((imp) => {
            const idx = merged.findIndex((a) => a.studentId === imp.studentId);
            if (idx !== -1) merged[idx] = imp;
            else merged.push(imp);
          });
          return merged;
        });
      } catch (err) {
        setImportError("Failed to parse file");
      }
    };
    reader.readAsArrayBuffer(file);
  }
  // Export attendance
  function handleExport() {
    exportToCSV(attendance, "attendance.csv");
  }
  const filtered = students.filter((s) =>
    [s.Unique_ID, s.First_Name, s.Father_Name, s.Grade, s.Sex].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  return (
    <div className="min-h-screen flex flex-col gap-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-green-900">Attendance Dashboard</h1>
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" onClick={handleExport}>Export Attendance</button>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            Import XLSX
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
      {importError && <div className="text-red-500 mb-2">{importError}</div>}
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
                <th className="border p-3 text-left">Present</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((student) => {
                const att = attendance.find((a) => a.studentId === student._id);
                return (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="border p-3">{student.Unique_ID}</td>
                    <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                    <td className="border p-3">{student.Grade}</td>
                    <td className="border p-3">
                      <input
                        type="checkbox"
                        checked={!!att?.present}
                        onChange={(e) => markAttendance(student._id, e.target.checked)}
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