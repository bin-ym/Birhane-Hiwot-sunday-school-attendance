'use client';
import { useSidebar } from './SidebarProvider';
import RoleSidebar, { LinkItem } from './RoleSidebar';

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
    <div className="flex min-h-screen flex-col md:flex-row relative"> {/* Added relative positioning */}
      {/* Sidebar */}
      <RoleSidebar
        roleTitle={roleTitle}
        links={links}
        isOpen={isOpen}
        toggle={toggleSidebar}
      />

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 bg-gray-50 overflow-y-auto z-10"> {/* Ensure this has a higher z-index */}
        {children}
      </main>
    </div>
  );
}