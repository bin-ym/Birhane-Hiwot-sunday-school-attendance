// src/components/tabs/AttendanceTab.tsx
"use client";
import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, Attendance } from "@/lib/models";
import {
  getSundaysInEthiopianYear,
  ethiopianToGregorianDate,
  formatDateForDisplay,
} from "@/lib/utils";
import { useMonthGrid, useDatePicker } from "kenat-ui";
import {
  CheckCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

// Define types for kenat-ui hooks (since kenat-ui may lack type definitions)
interface MonthGridDay {
  ethiopian: {
    year: number;
    month: number;
    day: number;
  };
  [key: string]: any;
}

interface MonthGrid {
  monthName: string;
  year: number;
  headers: string[];
  days: (MonthGridDay | null)[];
}

interface DatePickerState {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  formatted: string;
  open: boolean;
  grid: MonthGrid;
  days: (MonthGridDay | null)[];
}

interface DatePickerActions {
  toggleOpen: () => void;
  selectDate: (day: MonthGridDay) => void;
}

interface AttendanceTabProps {
  student: Student;
  attendanceRecords: Attendance[];
  currentDate: Date;
}

export default function AttendanceTab({
  student,
  attendanceRecords,
  currentDate,
}: AttendanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(10); // Default: Sene
  const [selectedYear, setSelectedYear] = useState(2017); // Default: 2017 EC
  const { grid } = useMonthGrid({
    year: selectedYear,
    month: selectedMonth,
    useGeez: false,
    weekdayLang: "amharic",
    weekStart: 0, // Start on Sunday
  }) as { grid: MonthGrid };
  const { state: pickerState, actions: pickerActions } = useDatePicker() as {
    state: DatePickerState;
    actions: DatePickerActions;
  };

  const sundays = getSundaysInEthiopianYear(student.Academic_Year);
  const sundaysByMonth = sundays.reduce((acc, date) => {
    const [day, month] = date.split("/");
    if (!acc[month]) acc[month] = [];
    acc[month].push(date);
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
    const rows = sundays.map((date) => {
      const r = attendanceMap[date];
      return {
        Student: `${student.First_Name} ${student.Father_Name}`,
        Date: date,
        Present: r?.present ? "Yes" : "No",
        Permission: r?.hasPermission ? "Yes" : "No",
        Reason: r?.reason || "",
        MarkedBy: r?.markedBy || "Birhaun Hiwot",
        Timestamp:
          r?.timestamp ||
          formatDateForDisplay(new Date(), { includeTime: true }),
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

    const tableData = sundays.map((date) => {
      const record = attendanceMap[date];
      const status = record
        ? record.present
          ? "Present"
          : record.hasPermission
          ? "Permission"
          : "Absent"
        : "Absent";

      return [
        date,
        status,
        record?.reason || (status === "Permission" ? "—" : "N/A"),
        record?.markedBy || "Birhaun Hiwot",
        record?.timestamp
          ? formatDateForDisplay(record.timestamp, { includeTime: true })
          : formatDateForDisplay(new Date(), { includeTime: true }),
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

  const handleGenerateReport = (format: string) => {
    if (format === "CSV") {
      exportToCSV();
    } else if (format === "PDF") {
      generatePDF();
    }
    setIsModalOpen(false);
  };

  const handleMarkAttendance = async (date: MonthGridDay) => {
    const dateStr = `${date.ethiopian.day.toString().padStart(2, "0")}/${date.ethiopian.month
      .toString()
      .padStart(2, "0")}/${date.ethiopian.year}`;
    try {
      const response = await fetch(`/api/attendance/${student._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          present: true, // Example; could be dynamic
          hasPermission: false,
          markedBy: "Admin",
          timestamp: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        // Refresh attendance records
        const updatedRecords = await fetch(`/api/attendance/${student._id}`).then((res) => res.json());
        // Note: Requires refreshAttendance prop to update state
      }
    } catch (error) {
      console.error("Failed to mark attendance:", error);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">
          Attendance for Academic Year {student.Academic_Year}
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Generate Report
        </button>
      </div>

      {/* Summary */}
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

      {/* Date Picker */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Mark Attendance</h3>
        <input
          type="text"
          readOnly
          ref={pickerState.inputRef}
          value={pickerState.formatted}
          onClick={pickerActions.toggleOpen}
          className="p-2 border rounded"
        />
        {pickerState.open && (
          <div className="absolute bg-white border rounded p-4 shadow-lg z-10">
            <div className="font-semibold mb-2">
              {pickerState.grid.monthName} {pickerState.grid.year}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {pickerState.days.map((day, i) =>
                day ? (
                  <button
                    key={i}
                    onClick={() => {
                      pickerActions.selectDate(day);
                      handleMarkAttendance(day);
                    }}
                    className="p-2 hover:bg-blue-100 rounded"
                  >
                    {day.ethiopian.day}
                  </button>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Month/Year Selector */}
      <div className="mb-4">
        <label className="mr-2">Select Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="mr-4 p-2 border rounded"
        >
          {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="mr-2">Select Year:</label>
        <input
          type="number"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="p-2 border rounded"
        />
      </div>

      {/* Calendar Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          {grid.monthName} {grid.year}
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center">
          {grid.headers.map((header: string, i: number) => (
            <div key={i} className="font-medium text-gray-600">
              {header}
            </div>
          ))}
          {grid.days.map((day: MonthGridDay | null, i: number) => {
            const dateStr = day
              ? `${day.ethiopian.day.toString().padStart(2, "0")}/${day.ethiopian.month
                  .toString()
                  .padStart(2, "0")}/${day.ethiopian.year}`
              : "";
            const record = dateStr ? attendanceMap[dateStr] : undefined;
            const gregorianDate = dateStr
              ? ethiopianToGregorianDate(
                  day!.ethiopian.year,
                  day!.ethiopian.month,
                  day!.ethiopian.day
                )
              : null;

            let status = "";
            let statusStyles = "";
            let statusIcon: JSX.Element | null = null;

            if (gregorianDate && gregorianDate > currentDate) {
              status = "";
            } else if (record) {
              status = record.present
                ? "Present"
                : record.hasPermission
                ? "Permission"
                : "Absent";
              statusStyles =
                status === "Present"
                  ? "bg-green-500 text-white"
                  : status === "Permission"
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white";
              statusIcon =
                status === "Present" ? (
                  <CheckCircleIcon className="w-5 h-5 inline-block mr-1" />
                ) : status === "Permission" ? (
                  <MinusCircleIcon className="w-5 h-5 inline-block mr-1" />
                ) : (
                  <XCircleIcon className="w-5 h-5 inline-block mr-1" />
                );
            } else if (day) {
              status = "Absent";
              statusStyles = "bg-red-500 text-white";
            }

            return (
              <div
                key={i}
                className={`p-2 ${day ? "bg-white" : "bg-gray-100"} border border-gray-200 rounded`}
              >
                {day ? (
                  <div>
                    <span>{day.ethiopian.day}</span>
                    {status && (
                      <p
                        className={`text-xs font-semibold ${statusStyles} inline-flex items-center px-2 py-1 rounded-full mt-1`}
                      >
                        {statusIcon}
                        {status}
                      </p>
                    )}
                  </div>
                ) : (
                  ""
                )}
              </div>
            );
          })}
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
            {Object.entries(sundaysByMonth).map(([month, dates]) => (
              <div
                key={month}
                className="bg-gradient-to-r from-gray-50 to-white border border-gray-300 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {month}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {dates.map((date) => {
                    const [day, month, year] = date.split("/").map(Number);
                    const gregorianDate = ethiopianToGregorianDate(year, month, day);
                    const record = attendanceMap[date];
                    let status = "";
                    let statusStyles = "";
                    let statusIcon: JSX.Element | null = null;

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
                          ? "bg-green-500 text-white"
                          : status === "Permission"
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white";
                      statusIcon =
                        status === "Present" ? (
                          <CheckCircleIcon className="w-5 h-5 inline-block mr-1" />
                        ) : status === "Permission" ? (
                          <MinusCircleIcon className="w-5 h-5 inline-block mr-1" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 inline-block mr-1" />
                        );
                    } else {
                      status = "Absent";
                      statusStyles = "bg-red-500 text-white";
                    }

                    const tooltip = `Marked by: ${
                      record?.markedBy || "Birhaun Hiwot"
                    }\nTime: ${
                      record?.timestamp
                        ? formatDateForDisplay(record.timestamp, {
                            includeTime: true,
                          })
                        : formatDateForDisplay(new Date(), {
                            includeTime: true,
                          })
                    }\nReason: ${
                      status === "Permission" ? record?.reason || "—" : "N/A"
                    }`;

                    return (
                      <div
                        key={date}
                        className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                      >
                        <p className="text-sm font-medium text-gray-800">
                          {date}
                        </p>
                        {status ? (
                          <p
                            className={`text-sm font-semibold ${statusStyles} inline-flex items-center px-2 py-1 rounded-full`}
                            title={tooltip}
                          >
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

      {/* Modal for Report Options */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Choose Report Format</h3>
            <div className="flex justify-around">
              <button
                onClick={() => handleGenerateReport("CSV")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleGenerateReport("PDF")}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Generate PDF
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}