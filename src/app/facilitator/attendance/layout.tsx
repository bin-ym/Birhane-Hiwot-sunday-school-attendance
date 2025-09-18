// src/app/facilitator/attendance/layout.tsx
"use client";
import RoleLayoutShell from "@/components/RoleLayoutShell";

const facilitatorLinks = [
  { label: "Attendance Management", href: "/facilitator/attendance" },
  { label: "Register New Student", href: "/facilitator/attendance/register" },
  { label: "Student List", href: "/facilitator/attendance/list" },
];

export default function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayoutShell roleTitle="Attendance Facilitator" links={facilitatorLinks}>
      {children}
    </RoleLayoutShell>
  );
}