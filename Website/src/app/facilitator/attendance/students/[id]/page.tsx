"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DetailsTab from '@/components/tabs/DetailsTab';
import AttendanceTab from '@/components/tabs/AttendanceTab';
import PaymentStatusTab from '@/components/tabs/PaymentStatusTab';

export default function FacilitatorStudentDetails() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'payment'>('details');
  const currentDate = new Date();

  useEffect(() => {
    // Fetch student data
    fetch(`/api/students/${id}`)
      .then((res) => res.json())
      .then((data) => setStudent(data))
      .catch(() => setStudent(null));
    // Fetch attendance data
    fetch(`/api/attendance/${id}`)
      .then((res) => res.json())
      .then((data) => setAttendanceRecords(data))
      .catch(() => setAttendanceRecords([]));
  }, [id]);

  if (!student) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Not Found</h1>
        <p className="text-gray-600 mb-4">No student found with ID: {id}</p>
        <Link
          href="/facilitator/attendance"
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
        >
          Back to Student List
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
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
      <Link
        href="/facilitator/attendance"
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 mt-6 inline-block"
      >
        Back to Student List
      </Link>
    </div>
  );
} 