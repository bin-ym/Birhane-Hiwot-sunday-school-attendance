"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Student, Attendance } from "@/lib/models";
import StudentDetails from "@/components/StudentDetails";

export default function EducationStudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
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
          fetch(`/api/attendance?studentId=${studentId}`),
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

    if (studentId) fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <main className="container-responsive py-6">
        <div className="card-responsive">
          <div className="mb-4 h-8 w-full animate-pulse rounded bg-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
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
          <h1 className="heading-responsive mb-6 font-serif text-primary">
            Student Not Found
          </h1>
          <p className="mb-4 text-muted-foreground">
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
        userRole="Education Admin"
        currentDate={new Date()}
        listBackHref="/education/students"
        listBackLabel="Back to students"
        showEditButton={true}
      />
    </main>
  );
}
