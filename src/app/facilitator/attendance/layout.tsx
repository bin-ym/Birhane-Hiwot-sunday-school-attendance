// src/app/facilitator/attendance/layout.tsx
"use client";
import Head from "next/head";
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
    <>
      <Head>
        {/* PWA manifest only for Attendance Facilitator area */}
        <link rel="manifest" href="/manifest-attendance.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <RoleLayoutShell roleTitle="Attendance Facilitator" links={facilitatorLinks}>
        {children}
      </RoleLayoutShell>
    </>
  );
}