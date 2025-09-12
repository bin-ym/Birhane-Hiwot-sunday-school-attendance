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

  if (loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <div className="animate-pulse bg-muted h-8 rounded w-full mb-4"></div>
          <div className="animate-pulse bg-muted h-8 rounded w-3/4"></div>
        </div>
      </main>
    );
  }

  if (error)
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <div className="text-destructive text-responsive p-8">{error}</div>
        </div>
      </main>
    );
  if (!student) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <h1 className="heading-responsive font-serif text-primary mb-6">
            Student Not Found
          </h1>
          <p className="text-muted-foreground text-responsive mb-4">No student found with ID: {id}</p>
          <Link
            href="/admin/students"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 text-responsive"
          >
            Back to Students
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-responsive py-6">
      <div className="card-responsive">
        <div className="flex items-center justify-between mb-6">
          <h1 className="heading-responsive font-serif text-primary">
            {student.First_Name} {student.Father_Name} {student.Grandfather_Name}
          </h1>
          <Link
            href="/admin/students"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 text-responsive"
            aria-label="Back to students list"
          >
            Back to Students
          </Link>
        </div>

        {/* Sub Navigation */}
        <div className="mb-6">
          <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
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
                className={`px-4 py-2 rounded-lg font-medium text-responsive ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
      </div>
    </main>
  );
}