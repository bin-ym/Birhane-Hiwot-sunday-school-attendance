// src/components/AttendanceTable.tsx
import { Student, Attendance } from '@/lib/models';
import React from 'react';

interface AttendanceTableProps {
  students: Student[] | null;
  attendance: Attendance[];
  selectedDate: string;
  isSunday: boolean;
  toggleAttendance: (studentId: string) => void;
  togglePermission: (studentId: string) => void;
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
}

export default function AttendanceTable({
  students,
  attendance,
  selectedDate,
  isSunday,
  toggleAttendance,
  togglePermission,
  setAttendance,
}: AttendanceTableProps) {
  if (!students || students.length === 0) {
    return <p>No students available</p>;
  }

  const toggleAbsent = (studentId: string) => {
    if (!isSunday) return alert("Attendance can only be marked on Sundays");
    const record = attendance.find(
      (r) => r.studentId === studentId && r.date === selectedDate
    );
    if (record) {
      // Clear both present and hasPermission to mark as absent
      if (record.present) toggleAttendance(studentId); // Uncheck present
      if (record.hasPermission) togglePermission(studentId); // Uncheck permission
    } else {
      // Create new record for absent
      setAttendance([
        ...attendance,
        {
          studentId,
          date: selectedDate,
          present: false,
          hasPermission: false,
        },
      ]);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-3 text-left text-gray-700">ID Number</th>
            <th className="border p-3 text-left text-gray-700">Name</th>
            <th className="border p-3 text-left text-gray-700">Grade</th>
            <th className="border p-3 text-center text-gray-700">Present</th>
            <th className="border p-3 text-center text-gray-700">Permission</th>
            <th className="border p-3 text-center text-gray-700">Absent</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            if (!student._id) {
              console.error(`Student with Unique_ID ${student.Unique_ID} has no _id`);
              return null; // Skip students without _id
            }
            const record = attendance.find(
              (r) => r.studentId === student._id?.toString() && r.date === selectedDate
            );
            const isAbsent = !record?.present && !record?.hasPermission;
            return (
              <tr key={student._id?.toString()} className="hover:bg-gray-50">
                <td className="border p-3">{student.Unique_ID}</td>
                <td className="border p-3">{`${student.First_Name} ${student.Father_Name}`}</td>
                <td className="border p-3">{student.Grade}</td>
                <td className="border p-3 text-center">
                  <input
                    type="checkbox"
                    checked={record?.present || false}
                    onChange={() => toggleAttendance(student._id!.toString())}
                    disabled={!isSunday}
                    className="h-5 w-5 rounded border-gray-300 focus:ring-blue-500"
                  />
                </td>
                <td className="border p-3 text-center">
                  <input
                    type="checkbox"
                    checked={record?.hasPermission || false}
                    onChange={() => togglePermission(student._id!.toString())}
                    disabled={!isSunday}
                    className="h-5 w-5 rounded border-gray-300 focus:ring-blue-500"
                  />
                </td>
                <td className="border p-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAbsent}
                    onChange={() => toggleAbsent(student._id!.toString())}
                    disabled={!isSunday}
                    className="h-5 w-5 rounded border-gray-300 focus:ring-blue-500"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}