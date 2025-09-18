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
        if (!res.ok)
          throw new Error(`HTTP ${res.status}: Failed to fetch students`);

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
        if (!res.ok)
          throw new Error(`HTTP ${res.status}: Failed to fetch facilitators`);

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
    <div className="space-y-8">
      <h1 className="heading-responsive text-blue-900">Admin Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid-responsive">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Link href="/admin/students" className="block">
          <div className="card-responsive hover:shadow-lg transition-shadow">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              Manage Students
            </h3>
            <p className="text-gray-600 text-responsive">
              Add, edit, or export student records.
            </p>
          </div>
        </Link>

        <Link href="/admin/facilitators" className="block">
          <div className="card-responsive hover:shadow-lg transition-shadow">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              Manage Facilitators
            </h3>
            <p className="text-gray-600 text-responsive">
              Assign roles and grades to facilitators.
            </p>
          </div>
        </Link>

        <Link href="/admin/reports" className="block">
          <div className="card-responsive hover:shadow-lg transition-shadow">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              View Reports
            </h3>
            <p className="text-gray-600 text-responsive">
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
    <div className="card-responsive flex flex-col items-center text-center">
      {value.loading ? (
        <span className="text-responsive">Loading...</span>
      ) : value.error ? (
        <span className="text-red-500 text-responsive">{value.error}</span>
      ) : (
        <span
          className={`text-xl sm:text-2xl lg:text-3xl font-bold ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
        >
          {value.value}
        </span>
      )}
      <span className="text-gray-600 mt-2 text-responsive">{title}</span>
    </div>
  );
}
