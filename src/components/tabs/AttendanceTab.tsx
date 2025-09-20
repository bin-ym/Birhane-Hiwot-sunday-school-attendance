// src/components/tabs/AttendanceTab.tsx
"use client";
import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, Attendance } from "@/lib/models";
import {
  getSundaysInEthiopianYear,
  ethiopianToGregorian,
  ETHIOPIAN_MONTHS,
} from "@/lib/utils";

import {
  CheckCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

interface AttendanceTabProps {
  student: Student;
  attendanceRecords: Attendance[];
  currentDate: Date;
  handleGenerateReport?: (format: "CSV" | "PDF") => void;
}

export default function AttendanceTab({
  student,
  attendanceRecords,
  currentDate,
  handleGenerateReport,
}: AttendanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parse academic year into a number (e.g., "2017-2018" -> 2017)
  const numericYear = parseInt(student.Academic_Year.split("-")[0], 10);

  // Get Sundays for the numeric Ethiopian year
  const sundays = getSundaysInEthiopianYear(numericYear);

  // Group Sundays by their month name
  const sundaysByMonth = sundays.reduce((acc, dateStr) => {
    const [dayStr, monthName, yearStr] = dateStr.split(" ");
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(dateStr);
    return acc;
  }, {} as Record<string, string[]>);

  const attendanceMap = Object.fromEntries(
    attendanceRecords.map((r) => [r.date, r])
  );

  const total = sundays.length;
  const present = sundays.filter((d) => attendanceMap[d]?.present).length;
  const permission = sundays.filter(
    (d) => !attendanceMap[d]?.present && attendanceMap[d]?.hasPermission
  ).length;
  const absent = total - present - permission;

  const escapeCSV = (val: string) => `"${val?.replace(/"/g, '""') || ""}"`;

  const exportToCSV = () => {
    const rows = sundays.map((dateStr) => {
      const record = attendanceMap[dateStr];
      return {
        Student: `${student.First_Name} ${student.Father_Name}`,
        Date: dateStr,
        Present: record?.present ? "Yes" : "No",
        Permission: record?.hasPermission ? "Yes" : "No",
        Reason: record?.reason || "",
        MarkedBy: record?.markedBy || "Birhaun Hiwot",
        Timestamp: record?.timestamp || new Date().toISOString(),
      };
    });

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((val) => escapeCSV(String(val)))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.First_Name}_Attendance.csv`;
    a.click();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    const title = `Attendance Report for ${student.First_Name} ${student.Father_Name}`;
    doc.text(title, 14, 20);

    const tableData = sundays.map((dateStr) => {
      const record = attendanceMap[dateStr];
      const status = record
        ? record.present
          ? "Present"
          : record.hasPermission
          ? "Permission"
          : "Absent"
        : "Absent";

      return [
        dateStr,
        status,
        record?.reason || (status === "Permission" ? "—" : "N/A"),
        record?.markedBy || "Birhaun Hiwot",
        record?.timestamp
          ? new Date(record.timestamp).toLocaleString()
          : new Date().toLocaleString(),
      ];
    });

    autoTable(doc, {
      head: [["Date", "Status", "Reason", "Marked By", "Timestamp"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 37, 41] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`${student.First_Name}_Attendance_Report.pdf`);
  };

  function formatDateForDisplay(
    timestamp: string,
    { includeTime }: { includeTime: boolean }
  ) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "2-digit",
      ...(includeTime && {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    return date.toLocaleString(undefined, options);
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">
          Attendance for Academic Year {student.Academic_Year}
        </h2>
        {handleGenerateReport && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Generate Report
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-800 font-medium mb-6">
        <div className="bg-green-100 px-3 py-1 rounded-full">
          Present: {present}/{total} ({((present / total) * 100).toFixed(0)}%)
        </div>
        <div className="bg-yellow-100 px-3 py-1 rounded-full">
          Permission: {permission}
        </div>
        <div className="bg-red-100 px-3 py-1 rounded-full">
          Absent: {absent}
        </div>
      </div>

      {/* Month-by-Month View */}
      <div className="overflow-x-auto">
        {Object.keys(sundaysByMonth).length === 0 ? (
          <p className="text-gray-600">
            No Sundays found for {student.Academic_Year}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries(sundaysByMonth).map(([monthName, dates]) => (
              <div
                key={monthName}
                className="bg-gradient-to-r from-gray-50 to-white border border-gray-300 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {monthName}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {dates.map((dateStr) => {
                    // Parse dateStr, e.g., "5 Meskerem 2017"
                    const [dayStr, monthNameStr, yearStr] = dateStr.split(" ");
                    const day = parseInt(dayStr, 10);
                    const year = parseInt(yearStr, 10);
                    const monthIndex =
                      ETHIOPIAN_MONTHS.indexOf(monthNameStr) + 1; // 1-based
                    const gregorianDate = ethiopianToGregorian(
                      year,
                      monthIndex,
                      day
                    );

                    const record = attendanceMap[dateStr];
                    let status = "";
                    let statusStyles = "";
                    let statusIcon: React.ReactNode = null;

                    if (gregorianDate > currentDate) {
                      status = "";
                    } else if (record) {
                      status = record.present
                        ? "Present"
                        : record.hasPermission
                        ? "Permission"
                        : "Absent";
                      statusStyles =
                        status === "Present"
                          ? "text-green-600"
                          : status === "Permission"
                          ? "text-yellow-600"
                          : "text-red-600";
                      statusIcon =
                        status === "Present" ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : status === "Permission" ? (
                          <MinusCircleIcon className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        );
                    } else {
                      status = "Absent";
                      statusStyles = "text-red-600";
                      statusIcon = (
                        <XCircleIcon className="w-5 h-5 text-red-600" />
                      );
                    }

                    return (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          {statusIcon}
                          <div>
                            <div className="font-medium text-gray-800">
                              {dateStr}
                            </div>
                            {attendanceMap[dateStr]?.timestamp && (
                              <div className="text-xs text-gray-500">
                                Marked at:{" "}
                                {formatDateForDisplay(
                                  attendanceMap[dateStr].timestamp!,
                                  { includeTime: true }
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`font-semibold ${statusStyles}`}>
                          {status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {handleGenerateReport && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Generate Report</h4>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  exportToCSV();
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  generatePDF();
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Export PDF
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
