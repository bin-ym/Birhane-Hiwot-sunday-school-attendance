// src/app/facilitator/attendance/students/[studentId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Student, Attendance, UserRole } from "@/lib/models";
import StudentDetails from "@/components/StudentDetails";

export default function StudentDetailsPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [studentRes, attendanceRes] = await Promise.all([
          fetch(`/api/students/${studentId}`),
          fetch(`/api/attendance/${studentId}`),
        ]);

        if (!studentRes.ok || !attendanceRes.ok) {
          throw new Error("Failed to load data");
        }

        const studentData = await studentRes.json();
        const attendanceData = await attendanceRes.json();

        setStudent(studentData);
        setAttendance(attendanceData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  if (loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <div className="animate-pulse bg-muted h-8 rounded w-full mb-4" />
          <div className="animate-pulse bg-muted h-8 rounded w-3/4" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <p className="text-destructive text-responsive">{error}</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <h1 className="heading-responsive font-serif text-primary mb-6">
            Student Not Found
          </h1>
          <p className="text-muted-foreground mb-4">
            No student found with ID: {studentId}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container-responsive py-6">
      <StudentDetails
        student={student}
        attendanceRecords={attendance}
        userRole="Attendance Facilitator"
        currentDate={new Date()}
        handleGenerateReport={undefined}
        allowedTabs={["details", "attendance", "payment"]}
      />
    </main>
  );
}
