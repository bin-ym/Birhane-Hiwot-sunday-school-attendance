// src/app/facilitator/attendance/students/[studentId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Student, Attendance } from "@/lib/models";

export default function StudentDetails() {
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
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!student) return <div>Student not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{`${student.First_Name} ${student.Father_Name}`}</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p><strong>ID:</strong> {student.Unique_ID}</p>
        <p><strong>Grade:</strong> {student.Grade}</p>
        <p><strong>Sex:</strong> {student.Sex}</p>
        <p><strong>Academic Year:</strong> {student.Academic_Year}</p>
      </div>
      <h2 className="text-xl font-semibold mt-6 mb-4">Attendance History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">Date</th>
              <th className="border p-3 text-left">Status</th>
              <th className="border p-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((record) => (
              <tr key={`${record.studentId}-${record.date}`} className="hover:bg-gray-50">
                <td className="border p-3">{record.date}</td>
                <td className="border p-3">
                  {record.present ? "Present" : record.hasPermission ? "Permission" : "Absent"}
                </td>
                <td className="border p-3">{record.reason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}