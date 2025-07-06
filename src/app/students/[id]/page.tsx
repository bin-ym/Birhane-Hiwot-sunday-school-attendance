"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import Link from 'next/link';
import { Student, Attendance } from '@/lib/imports';
import { getSundaysInEthiopianYear, ethiopianDateToGregorian, ETHIOPIAN_MONTHS } from '@/lib/utils';
import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface Student {
  _id: string;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
  DOB_Date: string;
  DOB_Month: string;
  DOB_Year: string;
  Age: number;
  Sex: string;
  Phone_Number: string;
  Class: string;
  Occupation: string;
  School?: string;
  School_Other?: string;
  Educational_Background?: string;
  Place_of_Work?: string;
  Address: string;
  Address_Other?: string;
  Academic_Year: string;
  Grade: string;
}

export default function StudentDetails() {
  const { status } = useSession();
  const { id } = useParams<{ id: string }>();
  const router = useRouter(); // Added router
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'payment' | 'results'>('details');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin"); // Use router.push for navigation
    } else if (status === "authenticated") {
      // Fetch student data
      fetch(`/api/students/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch student: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setStudent(data);
        })
        .catch(() => {
          setStudent(null);
        });

      // Fetch attendance data
      fetch(`/api/attendance/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch attendance: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setAttendanceRecords(data);
        })
        .catch(() => {
          setAttendanceRecords([]);
        });
    }
  }, [id, status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!student) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mx-auto my-6 max-w-4xl">
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
      </div>
    );
  }

  // Generate all Sundays for the academic year
  const currentDate = new Date(); // Use actual current date
  const sundays = student ? getSundaysInEthiopianYear(student.Academic_Year) : [];
  const sundaysByMonth = sundays.reduce((acc, date) => {
    const [month] = date.split(' ');
    if (!acc[month]) acc[month] = [];
    acc[month].push(date);
    return acc;
  }, {} as Record<string, string[]>);

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
          <button
            onClick={() => setActiveTab('results')}
            className={`py-2 px-4 font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          >
            Results
          </button>
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="mb-6">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                <th className="border p-3 text-left">Field</th>
                <th className="border p-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">ID Number</td>
                <td className="border p-3">{student.Unique_ID}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">First Name</td>
                <td className="border p-3">{student.First_Name}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Father Name</td>
                <td className="border p-3">{student.Father_Name}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Grandfather Name</td>
                <td className="border p-3">{student.Grandfather_Name}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Mother's Name</td>
                <td className="border p-3">{student.Mothers_Name}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Christian Name</td>
                <td className="border p-3">{student.Christian_Name || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Date of Birth (EC)</td>
                <td className="border p-3">{`${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year}`}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Age</td>
                <td className="border p-3">{student.Age}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Sex</td>
                <td className="border p-3">{student.Sex}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Phone Number</td>
                <td className="border p-3">{student.Phone_Number || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Class (World School)</td>
                <td className="border p-3">{student.Class || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Grade (Sunday School)</td>
                <td className="border p-3">{student.Grade}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Occupation</td>
                <td className="border p-3">{student.Occupation}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">School</td>
                <td className="border p-3">{student.School || student.School_Other || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Educational Background</td>
                <td className="border p-3">{student.Educational_Background || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Place of Work</td>
                <td className="border p-3">{student.Place_of_Work || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Address</td>
                <td className="border p-3">{student.Address || student.Address_Other || "-"}</td>
              </tr>
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="border p-3 font-medium">Academic Year</td>
                <td className="border p-3">{student.Academic_Year}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Attendance for Academic Year {student.Academic_Year}
          </h2>
          <div className="overflow-x-auto">
            {Object.keys(sundaysByMonth).length === 0 ? (
              <p className="text-gray-600">No Sundays found for {student.Academic_Year}.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {Object.entries(sundaysByMonth).map(([month, dates]) => (
                  <div
                    key={month}
                    className="bg-gradient-to-r from-gray-50 to-white border border-gray-300 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300"
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{month}</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {dates.map((date) => {
                        const gregorianDate = ethiopianDateToGregorian(date);
                        let status, statusStyles, statusIcon;

                        if (gregorianDate > currentDate) {
                          status = '';
                          statusStyles = '';
                          statusIcon = null;
                        } else {
                          const record = attendanceRecords.find((r) => r.date === date);
                          status = record
                            ? record.present
                              ? 'Present'
                              : record.hasPermission
                              ? 'Permission'
                              : 'Absent'
                            : 'Absent';
                          statusStyles =
                            status === 'Present'
                              ? 'bg-green-500 text-white'
                              : status === 'Permission'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-red-500 text-white';
                          statusIcon =
                            status === 'Present' ? (
                              <CheckCircleIcon className="w-5 h-5 inline-block mr-1" />
                            ) : status === 'Permission' ? (
                              <MinusCircleIcon className="w-5 h-5 inline-block mr-1" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 inline-block mr-1" />
                            );
                        }

                        return (
                          <div
                            key={date}
                            className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                          >
                            <p className="text-sm font-medium text-gray-800">{date}</p>
                            {status ? (
                              <p className={`text-sm font-semibold ${statusStyles} inline-flex items-center px-2 py-1 rounded-full`}>
                                {statusIcon}
                                {status}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400">No status</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Status Tab */}
      {activeTab === 'payment' && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Payment Status for Academic Year {student.Academic_Year}
          </h2>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {ETHIOPIAN_MONTHS.map((month) => (
                <div
                  key={month}
                  className="bg-gradient-to-r from-gray-50 to-white border border-gray-300 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300"
                >
                  <h3 className="text-lg font-semibold text-gray-800">{month}</h3>
                  <p className="text-sm text-gray-600 mt-2">Payment status pending</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="mb-6">
          <p>Results details will be displayed here.</p>
          {/* Additional results logic can be added here */}
        </div>
      )}

      <Link
        href="/register/old"
        className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
      >
        Back to Students
      </Link>
    </div>
  );
}