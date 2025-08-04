"use client";
import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, Attendance } from "@/lib/models";
import {
  getSundaysInEthiopianYear,
  ethiopianToGregorianDate,
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
}

export default function AttendanceTab({
  student,
  attendanceRecords,
  currentDate,
}: AttendanceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sundays = getSundaysInEthiopianYear(student.Academic_Year);
  const sundaysByMonth = sundays.reduce((acc, date) => {
    const [month] = date.split(" ");
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
      headStyles: { fillColor: [33, 37, 41] }, // dark gray
      alternateRowStyles: { fillColor: [245, 245, 245] }, // light gray
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
                    const gregorianDate = ethiopianDateToGregorian(date);
                    const record = attendanceMap[date];
                    let status = "";
                    let statusStyles = "";
                    let statusIcon = null;

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
    </div>
  );
}
