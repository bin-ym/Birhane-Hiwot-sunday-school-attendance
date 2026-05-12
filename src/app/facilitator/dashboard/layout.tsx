"use client";
import RoleLayoutShell from "@/components/RoleLayoutShell";

const educationFacilitatorLinks = [
  { label: "Dashboard", href: "/facilitator/dashboard" },
  { label: "Student Results", href: "/facilitator/results/students" },
  { label: "Reports", href: "/facilitator/results/reports" },
];

export default function FacilitatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayoutShell
      roleTitle="Education Facilitator"
      links={educationFacilitatorLinks}
    >
      {children}
    </RoleLayoutShell>
  );
}
