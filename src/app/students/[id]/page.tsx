// src/app/students/[id]/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Student, Attendance } from '@/lib/models';
import DetailsTab from '@/components/tabs/DetailsTab';
import AttendanceTab from '@/components/tabs/AttendanceTab';
import PaymentStatusTab from '@/components/tabs/PaymentStatusTab';
import ResultsTab from '@/components/tabs/ResultsTab';
import AdminLayout from '../../admin/layout';

export default function StudentDetails() {
  const { status } = useSession();
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'payment' | 'results'>('details');
  const currentDate = new Date('2025-07-06T20:55:00+03:00'); // Current date: July 6, 2025, 8:55 PM EAT

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated") {
      // Fetch student data
      fetch(`/api/students/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch student: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log('Fetched student:', data);
          setStudent(data);
        })
        .catch((error) => {
          console.error('Fetch student error:', error);
          setStudent(null);
        });

      // Fetch attendance data
      fetch(`/api/attendance/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch attendance: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log('Fetched attendance:', data);
          setAttendanceRecords(data);
        })
        .catch((error) => {
          console.error('Fetch attendance error:', error);
          setAttendanceRecords([]);
        });
    }
  }, [id, status]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!student) {
    return (
      <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Student Not Found
        </h1>
        <p className="text-gray-600 mb-4">No student found with ID: {id}</p>
        <Link
          href="/register/old"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          Back to Students
        </Link>
      </section>
    );
  }

  const isAdmin = pathname.startsWith('/admin/students');

  const detailsContent = (
    <section className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Details</h1>

      {/* Sub Navigation */}
      <div className="mb-4">
        <nav className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-4 font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-4 font-medium ${activeTab === 'attendance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`py-2 px-4 font-medium ${activeTab === 'payment' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Payment Status
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-2 px-4 font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Results
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && <DetailsTab student={student} />}
      {activeTab === 'attendance' && (
        <AttendanceTab
          student={student}
          attendanceRecords={attendanceRecords}
          currentDate={currentDate}
        />
      )}
      {activeTab === 'payment' && <PaymentStatusTab academicYear={student.Academic_Year} />}
      {activeTab === 'results' && <ResultsTab />}

      <Link
        href={isAdmin ? "/admin/students" : "/register/old"}
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 mt-6 inline-block"
      >
        Back to Students
      </Link>
    </section>
  );
  return isAdmin ? <AdminLayout>{detailsContent}</AdminLayout> : detailsContent;
}