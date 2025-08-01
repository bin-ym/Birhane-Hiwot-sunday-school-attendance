"use client";
import { useState } from "react";
import RegisterNew from "../../register/new/page";
import StudentList from "./StudentList";
import AttendanceSection from "./AttendanceSection";
import { signOut } from "next-auth/react";

const SECTIONS = [
  { key: "attendance", label: "Attendance Management" },
  { key: "register", label: "Register New Student" },
  { key: "list", label: "Student List" },
];

export default function AttendanceFacilitatorDashboard() {
  const [section, setSection] = useState("attendance");
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-green-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Attendance Facilitator</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`text-left px-4 py-2 rounded-lg ${section === s.key ? "bg-green-700" : "hover:bg-green-700"}`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
          <button
            className="text-left px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">
        {section === "register" && <RegisterNew />}
        {section === "list" && <StudentList />}
        {section === "attendance" && <AttendanceSection />}
      </main>
    </div>
  );
} 