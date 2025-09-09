// src/app/admin/students/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Student, Attendance } from "@/lib/models";
import DetailsTab from "@/components/tabs/DetailsTab";
import AttendanceTab from "@/components/tabs/AttendanceTab";
import PaymentStatusTab from "@/components/tabs/PaymentStatusTab";
import ResultsTab from "@/components/tabs/ResultsTab";

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<
    "details" | "attendance" | "payment" | "results"
  >("details");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/${id}`);
        if (!res.ok)
          throw new Error(`Student fetch error! Status: ${res.status}`);
        const data = await res.json();
        setStudent(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchAttendanceRecords() {
      if (!id) return;
      try {
        const res = await fetch(`/api/attendance?studentId=${id}`);
        if (!res.ok) throw new Error("Failed to fetch attendance records");
        const data = await res.json();
        setAttendanceRecords(data);
      } catch (err) {
        console.error(err);
      }
    }
    
    if (id) {
      fetchStudent();
      fetchAttendanceRecords();
    }
  }, [id]);

  if (loading) return <div>Loading student...</div>;
  if (error)
    return <div className="text-red-500 p-8">Error: {error}</div>;
  if (!student) {
    return (
      <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Student Not Found
        </h1>
        <p className="text-gray-600 mb-4">No student found with ID: {id}</p>
        <Link
          href="/admin/students"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          Back to Students
        </Link>
      </section>
    );
  }

  return (
    <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {student.First_Name} {student.Father_Name} {student.Grandfather_Name}
      </h1>

      {/* Sub Navigation */}
      <div className="mb-4">
        <nav className="flex space-x-4 border-b">
          {[
            { key: "details", label: "Details" },
            { key: "attendance", label: "Attendance" },
            { key: "payment", label: "Payment Status" },
            { key: "results", label: "Results" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key as "details" | "attendance" | "payment" | "results")
              }
              className={`py-2 px-4 font-medium ${
                activeTab === tab.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && <DetailsTab student={student} />}
      {activeTab === "attendance" && (
        <AttendanceTab 
          student={student} 
          attendanceRecords={attendanceRecords} 
          currentDate={new Date()}
        />
      )}
      {activeTab === "payment" && (
        <PaymentStatusTab
          academicYear={student.Academic_Year}
          studentId={id}
        />
      )}
      {activeTab === "results" && <ResultsTab studentId={id} />}

      <Link
        href="/admin/students"
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 mt-6 inline-block"
      >
        Back to Students
      </Link>
    </section>
  );
} 