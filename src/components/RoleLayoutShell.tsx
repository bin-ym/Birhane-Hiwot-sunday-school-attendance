//src/components/RoleLayoutShell.tsx

"use client";
import { useSidebar } from "./SidebarProvider";
import RoleSidebar, { LinkItem } from "./RoleSidebar";

export default function RoleLayoutShell({
  roleTitle,
  links,
  children,
}: {
  roleTitle: string;
  links: LinkItem[];
  children: React.ReactNode;
}) {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <div className="flex min-h-[calc(100vh-var(--app-navbar-height))] flex-1 flex-col bg-gray-50 md:min-h-0 md:flex-row">
      <RoleSidebar
        roleTitle={roleTitle}
        links={links}
        isOpen={isOpen}
        toggle={toggleSidebar}
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 pb-[env(safe-area-inset-bottom)]">
        <div className="container-responsive w-full py-4 md:py-6">{children}</div>
      </main>
    </div>
  );
}
