// src/app/admin/dashboard/page.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stat {
  value: string | number;
  loading: boolean;
  error: string | null;
}

export default function AdminDashboard() {
  const [studentsStat, setStudentsStat] = useState<Stat>({
    value: 0,
    loading: true,
    error: null,
  });

  const [facilitatorsStat, setFacilitatorsStat] = useState<Stat>({
    value: 0,
    loading: true,
    error: null,
  });

  const [attendanceStat, setAttendanceStat] = useState<Stat>({
    value: "0%",
    loading: true,
    error: null,
  });

  const [reportsStat] = useState<Stat>({
    value: "3",
    loading: false,
    error: null,
  });

  // Fetch total students
  useEffect(() => {
  async function fetchStudents() {
    try {
      const res = await fetch("/api/students/total");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch students`);

      const { total } = await res.json(); // ✅ Safe to parse now
      setStudentsStat({
        value: total.toLocaleString(),
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching total students:", err);
      setStudentsStat({
        value: 0,
        loading: false,
        error: "Failed to load",
      });
    }
  }
  fetchStudents();
}, []);

  // Fetch total facilitators
  useEffect(() => {
  async function fetchFacilitators() {
    try {
      console.log("Fetching total facilitators...");
      const res = await fetch("/api/facilitators/total");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch facilitators`);

      const { total } = await res.json();
      setFacilitatorsStat({
        value: total.toLocaleString(),
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching total facilitators:", err);
      setFacilitatorsStat({
        value: 0,
        loading: false,
        error: "Failed to load",
      });
    }
  }
  fetchFacilitators();
}, []);

  // Fetch attendance and calculate rate
  useEffect(() => {
    async function fetchAttendanceRate() {
      try {
        const res = await fetch("/api/attendance");
        if (!res.ok) throw new Error("Failed to fetch attendance");
        const attendance = await res.json();

        if (!Array.isArray(attendance)) {
          throw new Error("Invalid attendance data");
        }

        const total = attendance.length;
        const present = attendance.filter(
          (a: any) => a.present === true
        ).length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        setAttendanceStat({
          value: `${rate}%`,
          loading: false,
          error: null,
        });
      } catch (err) {
        setAttendanceStat({
          value: "0%",
          loading: false,
          error: "Failed to load",
        });
      }
    }
    fetchAttendanceRate();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Students" value={studentsStat} color="blue" />
        <StatCard title="Facilitators" value={facilitatorsStat} color="green" />
        <StatCard
          title="Attendance Rate"
          value={attendanceStat}
          color="yellow"
        />
        <StatCard title="Reports" value={reportsStat} color="purple" />
      </div>

      {/* Action Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/students" className="block">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-xl font-semibold">Manage Students</h3>
            <p className="text-gray-600 mt-2">
              Add, edit, or export student records.
            </p>
          </div>
        </Link>

        <Link href="/admin/facilitators" className="block">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-xl font-semibold">Manage Facilitators</h3>
            <p className="text-gray-600 mt-2">
              Assign roles and grades to facilitators.
            </p>
          </div>
        </Link>

        <Link href="/admin/reports" className="block">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-xl font-semibold">View Reports</h3>
            <p className="text-gray-600 mt-2">
              Attendance, payments, and performance.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: Stat;
  color: string;
}) {
  const colorClasses = {
    blue: "text-blue-700",
    green: "text-green-700",
    yellow: "text-yellow-600",
    purple: "text-purple-700",
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center">
      {value.loading ? (
        <span className="text-lg">Loading...</span>
      ) : value.error ? (
        <span className="text-red-500 text-sm">{value.error}</span>
      ) : (
        <span
          className={`text-2xl font-bold ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
        >
          {value.value}
        </span>
      )}
      <span className="text-gray-600 mt-2">{title}</span>
    </div>
  );
}
