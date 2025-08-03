"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Student, Attendance } from "@/lib/models";
import DetailsTab from "@/components/tabs/DetailsTab";
import AttendanceTab from "@/components/tabs/AttendanceTab";
import PaymentStatusTab from "@/components/tabs/PaymentStatusTab";

export default function FacilitatorStudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<
    "details" | "attendance" | "payment"
  >("details");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentDate = new Date();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch student details
        const studentRes = await fetch(`/api/students/${id}`);
        if (!studentRes.ok)
          throw new Error(`Student fetch error! Status: ${studentRes.status}`);
        const studentData = await studentRes.json();
        setStudent(studentData);

        // Fetch attendance records
        const attendanceRes = await fetch(`/api/attendance/${id}`);
        if (!attendanceRes.ok)
          throw new Error(
            `Attendance fetch error! Status: ${attendanceRes.status}`
          );
        const attendanceData = await attendanceRes.json();
        setAttendanceRecords(
          Array.isArray(attendanceData) ? attendanceData : []
        );

        setError(null);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!student) {
    return (
      <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Student Not Found
        </h1>
        <p className="text-gray-600 mb-4">No student found with ID: {id}</p>
        <Link
          href="/facilitator/attendance"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          Back to Student List
        </Link>
      </section>
    );
  }

  return (
    <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Details</h1>

      {/* Student Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700">
          {student.First_Name} {student.Father_Name}
        </h2>
        <p className="text-gray-600 mt-1">
          {student.Christian_Name} • Grade {student.Grade} •{" "}
          {student.Academic_Year}
        </p>
      </div>

      {/* Sub Navigation */}
      <div className="mb-4">
        <nav className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2 px-4 font-medium ${
              activeTab === "details"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`py-2 px-4 font-medium ${
              activeTab === "attendance"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`py-2 px-4 font-medium ${
              activeTab === "payment"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Payment Status
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && <DetailsTab student={student} />}
      {activeTab === "attendance" && (
        <AttendanceTab
          student={student}
          attendanceRecords={attendanceRecords}
          currentDate={currentDate}
        />
      )}
      {activeTab === "payment" && (
        <PaymentStatusTab academicYear={student.Academic_Year} />
      )}

      <Link
        href="/facilitator/attendance"
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 mt-6 inline-block"
      >
        Back to Student List
      </Link>
    </section>
  );
}
