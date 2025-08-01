"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import TeachersAttendance from "./TeachersAttendance";
import Subjects from "./Subjects";
import StudentsByGrade from "./StudentsByGrade";

const SECTIONS = [
  { key: "teachers", label: "Teachers Attendance" },
  { key: "subjects", label: "Subject Management" },
  { key: "students", label: "Student Records" },
];

export default function EducationDepartment() {
  const [section, setSection] = useState("subjects");

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-blue-900 text-white shadow-lg flex flex-col p-6">
        <h2 className="text-2xl font-bold mb-8">Education Department</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`text-left px-4 py-2 rounded-lg ${section === s.key ? "bg-blue-700" : "hover:bg-blue-700"}`}
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
        {section === "teachers" && <TeachersAttendance />}
        {section === "subjects" && <Subjects />}
        {section === "students" && <StudentsByGrade />}
      </main>
    </div>
  );
}