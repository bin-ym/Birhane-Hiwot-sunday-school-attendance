// src/app/facilitator/attendance/layout.tsx
"use client";
import Head from "next/head";
import RoleLayoutShell from "@/components/RoleLayoutShell";
import { useSession } from "next-auth/react";

const facilitatorLinks = [
  { label: "Take Attendance", href: "/facilitator/attendance" },
  { label: "Students & Payments", href: "/facilitator/attendance/students" },
  { label: "Reports", href: "/facilitator/attendance/reports" },
];

export default function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleTitle = "Attendance Facilitator";

  return (
    <>
      <Head>
        {/* PWA manifest only for Attendance Facilitator area */}
        <link rel="manifest" href="/manifest-attendance.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <RoleLayoutShell roleTitle={roleTitle} links={facilitatorLinks}>
        {children}
      </RoleLayoutShell>
    </>
  );
}
