// src/components/StudentDetails.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Student, Attendance, UserRole } from "@/lib/models";
import DetailsTab from "@/components/tabs/DetailsTab";
import AttendanceTab from "@/components/tabs/AttendanceTab";
import PaymentStatusTab from "@/components/tabs/PaymentStatusTab";
import ResultsTab from "@/components/tabs/ResultsTab";

interface StudentDetailsProps {
  student: Student;
  attendanceRecords: Attendance[];
  userRole: UserRole;
  currentDate?: Date;
  handleGenerateReport?: (format: "CSV" | "PDF") => void;
  allowedTabs?: string[];
}

type TabID = "details" | "attendance" | "payment" | "results";

const TAB_LABELS: Record<TabID, string> = {
  details: "Details",
  attendance: "Attendance",
  payment: "Payment Status",
  results: "Results",
};

export default function StudentDetails({
  student,
  attendanceRecords,
  userRole,
  currentDate = new Date(),
  allowedTabs,
}: StudentDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabID>("details");

  const getAllowedTabs = (role: UserRole): TabID[] => {
    switch (role) {
      case "Admin":
        return ["details", "attendance", "payment", "results"];
      case "Attendance Facilitator":
        return ["details", "attendance"];
      case "Education Facilitator":
        return ["details", "payment", "results"];
      default:
        return ["details"];
    }
  };

  const validTabs = allowedTabs
    ? (allowedTabs as TabID[]).filter((tab) =>
        Object.keys(TAB_LABELS).includes(tab)
      )
    : getAllowedTabs(userRole);

  return (
    <div className="card-responsive">
      <header className="flex items-center justify-between mb-6">
        <h1 className="heading-responsive font-serif text-primary">
          {student.First_Name} {student.Father_Name} {student.Grandfather_Name}
        </h1>
        <Link
          href="/admin/students"
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80"
        >
          Back to Students
        </Link>
      </header>

      {/* Tabs Navigation */}
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2 mb-6">
        {validTabs.map((tabId) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === tabId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {TAB_LABELS[tabId]}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === "details" && <DetailsTab student={student} />}
      {activeTab === "attendance" && (
        <AttendanceTab
          student={student}
          attendanceRecords={attendanceRecords}
          currentDate={currentDate}
          {...(userRole === "Admin" ? { handleGenerateReport: () => {} } : {})}
        />
      )}
      {activeTab === "payment" && (
        <PaymentStatusTab
          academicYear={student.Academic_Year}
          studentId={student.Unique_ID}
        />
      )}
      {activeTab === "results" && <ResultsTab studentId={student.Unique_ID} />}
    </div>
  );
}
