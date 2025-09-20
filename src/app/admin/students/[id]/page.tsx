// src/app/admin/students/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Student, Attendance, UserRole } from "@/lib/models";
import StudentDetails from "@/components/StudentDetails";

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get user role from your authentication system
  const userRole: UserRole = 'Admin'; // Replace with actual role from auth

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, attendanceRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch(`/api/attendance?studentId=${id}`),
        ]);

        if (!studentRes.ok) throw new Error(`Student fetch error: ${studentRes.status}`);
        if (!attendanceRes.ok) throw new Error(`Attendance fetch error: ${attendanceRes.status}`);

        const [studentData, attendanceData]: [Student, Attendance[]] =
          await Promise.all([studentRes.json(), attendanceRes.json()]);

        setStudent(studentData);
        setAttendanceRecords(attendanceData);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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
          <h1 className="heading-responsive font-serif text-primary mb-6">Student Not Found</h1>
          <p className="text-muted-foreground mb-4">No student with ID: {id}</p>
          <Link
            href="/admin/students"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80"
          >
            Back to Students
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-responsive py-6">
      <StudentDetails 
        student={student}
        attendanceRecords={attendanceRecords}
        userRole={userRole}
      />
    </main>
  );
}