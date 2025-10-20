"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/utils";
import { Student } from "@/lib/models";

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason?: string;
  markedBy?: string;
  timestamp?: string;
  submissionId?: string;
}

export default function AttendanceSection() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const currentDate = useMemo(() => new Date(), []);
  const ethiopianDate = gregorianToEthiopian(currentDate);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tempAttendance, setTempAttendance] = useState<AttendanceRecord[]>([]);
  const [isSunday, setIsSunday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facilitatorGrade = session?.user?.grade as string | string[] | undefined;
  const facilitatorEmail = session?.user?.email || "Attendance Facilitator";

  useEffect(() => {
    setIsSunday(currentDate.getDay() === 0);

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch students
        let url = "/api/students";
        if (facilitatorGrade) {
          const params = new URLSearchParams();
          if (Array.isArray(facilitatorGrade)) {
            facilitatorGrade.forEach((grade) => params.append("grade", grade));
          } else {
            params.append("grade", facilitatorGrade);
          }
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
        }
        const studentRes = await fetch(url);
        if (!studentRes.ok) throw new Error("Failed to load students");
        const studentData = await studentRes.json();
        setStudents(studentData);

        // Fetch temporary attendance
        const formattedDate = formatEthiopianDate(currentDate);
        const tempRes = await fetch(
          `/api/attendance/temp?date=${encodeURIComponent(
            formattedDate
          )}&markedBy=${encodeURIComponent(facilitatorEmail)}`
        );
        if (!tempRes.ok) {
          const errorData = await tempRes.json();
          console.warn(
            `Failed to load temp attendance: ${tempRes.status} - ${
              errorData.error || "No error message"
            }`
          );
          setTempAttendance([]); // Fallback to empty array
        } else {
          const tempData = await tempRes.json();
          setTempAttendance(tempData);
        }

        // Fetch final attendance
        const finalRes = await fetch(
          `/api/attendance?date=${encodeURIComponent(formattedDate)}`
        );
        if (!finalRes.ok) throw new Error("Failed to load final attendance");
        const finalData = await finalRes.json();
        setAttendance(
          finalData.filter((record: AttendanceRecord) =>
            studentData.some(
              (student: Student) => student._id?.toString() === record.studentId
            )
          )
        );

        setError(null);
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("fetchData error:", errorMessage);
        setError(errorMessage);
        setStudents([]);
        setTempAttendance([]);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    }

    if (facilitatorGrade && facilitatorGrade.length > 0) {
      fetchData();
    } else {
      setStudents([]);
      setTempAttendance([]);
      setAttendance([]);
      setError("No grade assigned. Please contact admin.");
    }
  }, [currentDate, facilitatorGrade, facilitatorEmail]);

  const formattedDate = formatEthiopianDate(currentDate);
  const currentYear = Math.max(
    ...students.map((s: Student) => parseInt(s.Academic_Year)).filter(Boolean)
  );
  const currentYearStudents = students.filter(
    (s: Student) => s.Academic_Year === String(currentYear)
  );

  const toggleAttendance = (studentId: string) => {
    if (!isSunday) return alert("Attendance can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, present: !r.present, hasPermission: false, reason: "" }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: true,
              hasPermission: false,
              reason: "",
              markedBy: facilitatorEmail,
            },
          ]
    );
  };

  const togglePermission = (studentId: string) => {
    if (!isSunday) return alert("Permission can only be marked on Sundays");
    const record = attendance.find(
      (r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
    );
    setAttendance(
      record
        ? attendance.map((r: AttendanceRecord) =>
            r.studentId === studentId && r.date === formattedDate
              ? { ...r, hasPermission: !r.hasPermission, present: false }
              : r
          )
        : [
            ...attendance,
            {
              studentId,
              date: formattedDate,
              present: false,
              hasPermission: true,
              reason: "",
              markedBy: facilitatorEmail,
            },
          ]
    );
  };

  const updateReason = (studentId: string, reason: string) => {
    setAttendance(
      attendance.map((r: AttendanceRecord) =>
        r.studentId === studentId && r.date === formattedDate
          ? { ...r, reason }
          : r
      )
    );
  };

  const generateExcel = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Attendance_${formattedDate.replace(/[\s,]+/g, "_")}.xlsx`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSunday) return alert("Attendance can only be submitted on Sundays");
    let allRecords = attendance;
    if (
      !attendance.some(
        (r: AttendanceRecord) =>
          r.date === formattedDate && (r.present || r.hasPermission)
      )
    ) {
      // Generate Absent records for unmarked students
      allRecords = currentYearStudents.map((student: Student) => {
        const record = attendance.find(
          (r: AttendanceRecord) =>
            r.studentId === student._id?.toString() && r.date === formattedDate
        );
        return (
          record || {
            studentId: student._id?.toString() || "",
            date: formattedDate,
            present: false,
            hasPermission: false,
            reason: "",
            markedBy: facilitatorEmail,
          }
        );
      });
      setAttendance(allRecords);
    }

    setLoading(true);
    setError(null);
    try {
      const timestamp = formatEthiopianDate(new Date());
      const payload = {
        date: formattedDate,
        attendance: allRecords
          .filter((r) => r.date === formattedDate)
          .map((r) => ({
            ...r,
            markedBy: facilitatorEmail,
            timestamp,
          })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "Failed to queue attendance");
      }

      // Update tempAttendance
      const tempRes = await fetch(
        `/api/attendance/temp?date=${encodeURIComponent(
          formattedDate
        )}&markedBy=${encodeURIComponent(facilitatorEmail)}`
      );
      if (tempRes.ok) {
        const tempData = await tempRes.json();
        setTempAttendance(tempData);
      } else {
        console.warn(
          `Failed to fetch temp attendance after submit: ${tempRes.status}`
        );
        setTempAttendance([]);
      }

      // Generate Excel with current submission
      const data = currentYearStudents.map((student: Student) => {
        const record = allRecords.find(
          (r: AttendanceRecord) =>
            r.studentId === student._id?.toString() && r.date === formattedDate
        );
        return {
          Unique_ID: student.Unique_ID,
          First_Name: student.First_Name,
          Father_Name: student.Father_Name,
          Grade: student.Grade,
          Status: record?.present
            ? "Present"
            : record?.hasPermission
            ? `Permission${record.reason ? ` (${record.reason})` : ""}`
            : "Absent",
          Date: formattedDate,
        };
      });
      generateExcel(data);

      alert("Attendance queued successfully! It will be processed within an hour.");
      setAttendance([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = currentYearStudents.filter(
    (student: Student) =>
      student._id &&
      (selectedGrade === "" || student.Grade === selectedGrade) &&
      ((student.Unique_ID || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (student.First_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Father_Name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.Grade || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="card-responsive">
      <h1 className="heading-responsive text-gray-800 mb-6">
        Attendance Management
      </h1>
      {error && (
        <div className="text-red-500 mb-4 text-responsive">{error}</div>
      )}
      {facilitatorGrade && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-responsive">
          Assigned to:{" "}
          <strong>
            {Array.isArray(facilitatorGrade)
              ? facilitatorGrade.join(", ")
              : facilitatorGrade}
          </strong>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <p className="p-3 border border-gray-300 rounded-lg bg-gray-50 text-responsive">
            {formattedDate}
          </p>
          {!isSunday && (
            <p className="text-red-500 text-sm mt-1">
              Attendance can only be marked on Sundays
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Search by ID, Name, or Grade"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
      >
        <div className="flex-1 sm:w-1/2">
          <label
            htmlFor="classFilter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Grade (Optional)
          </label>
          <select
            id="classFilter"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-3 border rounded-lg text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Assigned Grades</option>
            {[...new Set(currentYearStudents.map((s: Student) => s.Grade))].map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            )}
          </select>
        </div>
        <button
          type="submit"
          className="btn-responsive bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Queue Attendance"}
        </button>
      </form>

      <div className="hidden sm:block table-responsive max-h-[500px] overflow-y-auto">
        <table className="min-w-full border-collapse border bg-white rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border p-3 text-left text-responsive font-medium">ID Number</th>
              <th className="border p-3 text-left text-responsive font-medium">Name</th>
              <th className="border p-3 text-left text-responsive font-medium">Grade</th>
              <th className="border p-3 text-left text-responsive font-medium">Present</th>
              <th className="border p-3 text-left text-responsive font-medium">Permission</th>
              <th className="border p-3 text-left text-responsive font-medium">Reason</th>
              <th className="border p-3 text-left text-responsive font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student: Student) => {
              const record = attendance.find(
                (r: AttendanceRecord) =>
                  r.studentId === student._id?.toString() &&
                  r.date === formattedDate
              );
              const tempRecord = tempAttendance.find(
                (r: AttendanceRecord) =>
                  r.studentId === student._id?.toString() &&
                  r.date === formattedDate &&
                  r.markedBy === facilitatorEmail
              );
              const finalRecord = attendance.find(
                (r: AttendanceRecord) =>
                  r.studentId === student._id?.toString() &&
                  r.date === formattedDate
              );
              return (
                <tr key={student._id?.toString()} className="hover:bg-gray-50">
                  <td className="border p-3 text-responsive">{student.Unique_ID}</td>
                  <td className="border p-3 text-responsive">{`${student.First_Name} ${student.Father_Name}`}</td>
                  <td className="border p-3 text-responsive">{student.Grade}</td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.present}
                      onChange={() =>
                        student._id && toggleAttendance(student._id.toString())
                      }
                      disabled={!isSunday || loading || !!finalRecord}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!record?.hasPermission}
                      onChange={() =>
                        student._id && togglePermission(student._id.toString())
                      }
                      disabled={!isSunday || loading || !!finalRecord}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border p-3">
                    <input
                      type="text"
                      value={record?.reason || ""}
                      onChange={(e) =>
                        student._id &&
                        updateReason(student._id.toString(), e.target.value)
                      }
                      className="w-full p-2 border rounded text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!isSunday || !record?.hasPermission || loading || !!finalRecord}
                      placeholder="Reason for permission"
                    />
                  </td>
                  <td className="border p-3 text-responsive">
                    {finalRecord ? (
                      <span className="text-green-500">
                        Final: {finalRecord.present ? "Present" : finalRecord.hasPermission ? `Permission (${finalRecord.reason || ""})` : "Absent"}
                      </span>
                    ) : tempRecord ? (
                      <span className="text-orange-500">
                        Queued: {tempRecord.present ? "Present" : tempRecord.hasPermission ? `Permission (${tempRecord.reason || ""})` : "Absent"}
                      </span>
                    ) : (
                      "Not marked"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto">
        {filteredStudents.map((student: Student) => {
          const record = attendance.find(
            (r: AttendanceRecord) =>
              r.studentId === student._id?.toString() &&
              r.date === formattedDate
          );
          const tempRecord = tempAttendance.find(
            (r: AttendanceRecord) =>
              r.studentId === student._id?.toString() &&
              r.date === formattedDate &&
              r.markedBy === facilitatorEmail
          );
          const finalRecord = attendance.find(
            (r: AttendanceRecord) =>
              r.studentId === student._id?.toString() &&
              r.date === formattedDate
          );
          return (
            <div key={student._id?.toString()} className="card-responsive">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-responsive">{student.Unique_ID}</div>
                    <div className="text-responsive">{`${student.First_Name} ${student.Father_Name}`}</div>
                    <div className="text-sm text-gray-600">Grade: {student.Grade}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-responsive">
                      <input
                        type="checkbox"
                        checked={!!record?.present}
                        onChange={() =>
                          student._id && toggleAttendance(student._id.toString())
                        }
                        disabled={!isSunday || loading || !!finalRecord}
                        className="w-4 h-4"
                      />
                      Present
                    </label>
                    <label className="flex items-center gap-2 text-responsive">
                      <input
                        type="checkbox"
                        checked={!!record?.hasPermission}
                        onChange={() =>
                          student._id && togglePermission(student._id.toString())
                        }
                        disabled={!isSunday || loading || !!finalRecord}
                        className="w-4 h-4"
                      />
                      Permission
                    </label>
                  </div>
                  {record?.hasPermission && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for permission
                      </label>
                      <input
                        type="text"
                        value={record?.reason || ""}
                        onChange={(e) =>
                          student._id && updateReason(student._id.toString(), e.target.value)
                        }
                        className="w-full p-2 border rounded text-responsive focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isSunday || loading || !!finalRecord}
                        placeholder="Enter reason"
                      />
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-medium">Status: </span>
                    {finalRecord ? (
                      <span className="text-green-500">
                        Final: {finalRecord.present ? "Present" : finalRecord.hasPermission ? `Permission (${finalRecord.reason || ""})` : "Absent"}
                      </span>
                    ) : tempRecord ? (
                      <span className="text-orange-500">
                        Queued: {tempRecord.present ? "Present" : tempRecord.hasPermission ? `Permission (${tempRecord.reason || ""})` : "Absent"}
                      </span>
                    ) : (
                      "Not marked"
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}