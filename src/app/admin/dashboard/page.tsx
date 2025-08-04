"use client";
import { useEffect, useState } from "react";
import { Student, User, Attendance } from "@/lib/models";

const PAGE_SIZE = 10;

interface DashboardData {
  students: Student[];
  facilitators: User[];
  attendance: Attendance[];
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
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

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [facilitators, setFacilitators] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  // Pagination
  const [studentPage, setStudentPage] = useState(1);
  const [facilitatorPage, setFacilitatorPage] = useState(1);

  // Modal state
  const [showFacModal, setShowFacModal] = useState(false);
  const [editFac, setEditFac] = useState<User | null>(null);
  const [facForm, setFacForm] = useState({ name: "", email: "", password: "", role: "facilitator1" });
  const [facFormError, setFacFormError] = useState<string | null>(null);
  const [facFormLoading, setFacFormLoading] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetch("/api/facilitators/roles").then(res => res.json()).then(setRoles);
  }, []);

  function fetchData() {
    setLoading(true);
    Promise.all([
      fetch("/api/students").then((res) => res.json()),
      fetch("/api/facilitators").then((res) => res.json()),
      fetch("/api/attendance").then((res) => res.json()),
    ])
      .then(([studentsData, facilitatorsData, attendanceData]) => {
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setFacilitators(Array.isArray(facilitatorsData) ? facilitatorsData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }

  // Facilitator CRUD
  function openFacModal(fac: User | null = null) {
    setEditFac(fac);
    setFacForm(fac ? { name: fac.name || "", email: fac.email, password: "", role: fac.role } : { name: "", email: "", password: "", role: "facilitator1" });
    setFacFormError(null);
    setShowFacModal(true);
  }
  function closeFacModal() {
    setShowFacModal(false);
    setEditFac(null);
    setFacForm({ name: "", email: "", password: "", role: "facilitator1" });
    setFacFormError(null);
  }
  async function handleFacFormSubmit(e: React.FormEvent) {
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
      closeFacModal();
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

  // Filtered data
  const filteredStudents = students.filter((s) =>
    [s.Unique_ID, s.First_Name, s.Father_Name, s.Grade, s.Sex].join(" ").toLowerCase().includes(studentSearch.toLowerCase())
  );
  const filteredFacilitators = facilitators.filter((f) =>
    [f.name, f.email, f.role].join(" ").toLowerCase().includes(facilitatorSearch.toLowerCase())
  );

  // Pagination logic
  const pagedStudents = filteredStudents.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE);
  const pagedFacilitators = filteredFacilitators.slice((facilitatorPage - 1) * PAGE_SIZE, facilitatorPage * PAGE_SIZE);
  const studentPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const facilitatorPages = Math.ceil(filteredFacilitators.length / PAGE_SIZE);

  // Attendance Rate Calculation
  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((a) => a.present).length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col gap-8">
      <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Admin Dashboard</h1>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-blue-700">{loading ? "-" : students.length}</span>
          <span className="text-gray-600 mt-2">Total Students</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-700">{loading ? "-" : facilitators.length}</span>
          <span className="text-gray-600 mt-2">Facilitators</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-yellow-600">{loading ? "-" : `${attendanceRate}%`}</span>
          <span className="text-gray-600 mt-2">Attendance Rate</span>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
          <span className="text-2xl font-bold text-purple-700">{loading ? "-" : "3"}</span>
          <span className="text-gray-600 mt-2">Reports</span>
        </div>
      </div>
      {/* Student Records Table */}
      <div className="bg-white shadow rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">Student Records</h2>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            onClick={() => exportToCSV(filteredStudents, "students.csv")}
            disabled={filteredStudents.length === 0}
          >
            Export CSV
          </button>
        </div>
        <input
          type="text"
          placeholder="Search students..."
          className="mb-4 p-2 border rounded w-full max-w-xs"
          value={studentSearch}
          onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
        />
        {loading ? (
          <div className="text-gray-500">Loading students...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto max-h-[400px]">
            <table className="min-w-full border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">ID Number</th>
                  <th className="border p-3 text-left">Name</th>
                  <th className="border p-3 text-left">Grade</th>
                  <th className="border p-3 text-left">Sex</th>
                </tr>
              </thead>
              <tbody>
                {pagedStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="border p-3">{student.Unique_ID}</td>
                    <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                    <td className="border p-3">{student.Grade}</td>
                    <td className="border p-3">{student.Sex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="flex gap-2 mt-4 justify-center">
              <button
                className="px-3 py-1 rounded border bg-gray-100"
                onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                disabled={studentPage === 1}
              >
                Prev
              </button>
              <span className="px-2">Page {studentPage} of {studentPages}</span>
              <button
                className="px-3 py-1 rounded border bg-gray-100"
                onClick={() => setStudentPage((p) => Math.min(studentPages, p + 1))}
                disabled={studentPage === studentPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Facilitator Management */}
      <div className="bg-white shadow rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">Facilitator Management</h2>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => openFacModal()}
          >
            + Add Facilitator
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ml-2"
            onClick={() => exportToCSV(filteredFacilitators, "facilitators.csv")}
            disabled={filteredFacilitators.length === 0}
          >
            Export CSV
          </button>
        </div>
        <input
          type="text"
          placeholder="Search facilitators..."
          className="mb-4 p-2 border rounded w-full max-w-xs"
          value={facilitatorSearch}
          onChange={(e) => { setFacilitatorSearch(e.target.value); setFacilitatorPage(1); }}
        />
        {loading ? (
          <div className="text-gray-500">Loading facilitators...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto max-h-[300px]">
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
                {pagedFacilitators.map((fac: User) => (
                  <tr key={fac._id} className="hover:bg-gray-50">
                    <td className="border p-3">{fac.name || "-"}</td>
                    <td className="border p-3">{fac.email}</td>
                    <td className="border p-3 capitalize">{fac.role}</td>
                    <td className="border p-3 flex gap-2">
                      <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                        onClick={() => openFacModal(fac)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        onClick={() => handleDeleteFac(fac._id!)}
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
                onClick={() => setFacilitatorPage((p) => Math.max(1, p - 1))}
                disabled={facilitatorPage === 1}
              >
                Prev
              </button>
              <span className="px-2">Page {facilitatorPage} of {facilitatorPages}</span>
              <button
                className="px-3 py-1 rounded border bg-gray-100"
                onClick={() => setFacilitatorPage((p) => Math.min(facilitatorPages, p + 1))}
                disabled={facilitatorPage === facilitatorPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {/* Modal for Add/Edit Facilitator */}
        {showFacModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={closeFacModal}
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
                  {roles.map((r) => (
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
      {/* Reports Placeholder */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Reports</h2>
        <div className="text-gray-500">[Reports and export options will go here]</div>
      </div>
    </div>
  );
} 