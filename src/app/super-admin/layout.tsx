"use client";

import RoleLayoutShell from "@/components/RoleLayoutShell";

const superAdminLinks = [
  { label: "Dashboard", href: "/super-admin/dashboard" },
  { label: "Global Students", href: "/super-admin/students" },
  { label: "Department Admins", href: "/super-admin/department-admins" },
  { label: "Global Facilitators", href: "/super-admin/facilitators" },
  { label: "Reports", href: "/super-admin/reports" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayoutShell roleTitle="Super Admin" links={superAdminLinks}>
      {children}
    </RoleLayoutShell>
  );
}
