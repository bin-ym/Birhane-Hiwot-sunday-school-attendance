// src/app/facilitator/attendance/page.tsx
"use client";

import { useState } from "react";
import StudentList from "./StudentList";
import AttendanceSection from "./AttendanceSection";
import { StudentForm } from "@/components/StudentForm";
import { Student } from "@/lib/models";
import { signOut } from "next-auth/react";

const SECTIONS = [
  { key: "attendance", label: "Attendance Management" },
  { key: "register", label: "Register New Student" },
  { key: "list", label: "Student List" },
];

export default function AttendanceFacilitatorDashboard() {
  const [section, setSection] = useState("attendance");
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddStudent = async (studentData: Omit<Student, "_id">) => {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save student");
      }
      setShowAddModal(false);
      // Refresh student list after adding
      window.location.reload(); // Simple refresh; replace with state update if needed
    } catch (err) {
      console.error(err);
      alert("Failed to save student: " + (err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-green-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Attendance Facilitator</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`text-left px-4 py-2 rounded-lg ${section === s.key ? "bg-green-700" : "hover:bg-green-700"}`}
              onClick={() => {
                setSection(s.key);
                setShowAddModal(s.key === "register");
              }}
            >
              {s.label}
            </button>
          ))}
          <button
            className="text-left px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">
        {section === "list" && <StudentList />}
        {section === "attendance" && <AttendanceSection />}
        {showAddModal && (
          <StudentForm
            student={null}
            onCancel={() => setShowAddModal(false)}
            onSave={handleAddStudent}
          />
        )}
      </main>
    </div>
  );
}