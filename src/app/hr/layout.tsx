// src/app/hr/layout.tsx
"use client";
import Head from "next/head";
import RoleLayoutShell from "@/components/RoleLayoutShell";
import { useSession } from "next-auth/react";

const facilitatorLinks = [
  { label: "Attendance Management", href: "/hr" },
  { label: "Register New Student", href: "/hr/register" },
  { label: "Student List", href: "/hr/list" },
];

const hrAdminLinks = [
  { label: "Dashboard", href: "/hr" },
  { label: "Manage Attendance", href: "/hr/attendance" },
  { label: "Attendance Facilitators", href: "/hr/manage-facilitators" },
  { label: "Manage Students", href: "/hr/students" },
  { label: "Reports", href: "/hr/reports" },
];

export default function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = String(session?.user?.role || "Attendance Facilitator");

  const isHr = role === "HR Admin" || role === "Attendance Facilitator";
  const links = isHr ? hrAdminLinks : facilitatorLinks;
  const roleTitle = isHr ? "HR Admin" : "Attendance Facilitator";

  return (
    <>
      <Head>
        {/* PWA manifest only for Attendance Facilitator area */}
        <link rel="manifest" href="/manifest-attendance.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <RoleLayoutShell roleTitle={roleTitle} links={links}>
        {children}
      </RoleLayoutShell>
    </>
  );
}
