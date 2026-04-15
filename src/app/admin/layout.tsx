// src/app/admin/layout.tsx
"use client";

import RoleLayoutShell from "@/components/RoleLayoutShell";
import { useSession } from "next-auth/react";

const baseAdminLinks = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Students", href: "/admin/students" },
  { label: "Facilitators", href: "/admin/facilitators" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Settings", href: "/admin/settings" },
];

const hrAdminLinks = [
  { label: "Attendance Facilitators", href: "/hr/manage-facilitators" },
  { label: "Manage Attendance", href: "/hr" },
  { label: "Students & Payments 1", href: "/admin/students" },
  { label: "Reports", href: "/admin/reports" },
];

const educationAdminLinks = [
  { label: "Education Facilitators", href: "/education/manage-facilitators" },
  { label: "Teachers & Results", href: "/education" },
  { label: "Reports", href: "/admin/reports" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = String(session?.user?.role || "Admin");

  let links = baseAdminLinks;
  let roleTitle = "Admin";

  if (role === "HR Admin" || role === "Attendance Facilitator") {
    links = hrAdminLinks;
    roleTitle = "HR Admin";
  } else if (role === "Education Admin" || role === "Education Facilitator") {
    links = educationAdminLinks;
    roleTitle = "Education Admin";
  }

  return (
    <RoleLayoutShell roleTitle={roleTitle} links={links}>
      {children}
    </RoleLayoutShell>
  );
}
