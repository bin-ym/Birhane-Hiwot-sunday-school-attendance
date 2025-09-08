// src/app/layout.tsx

import './globals.css';
import NavBar from '@/components/NavBar';
import { SidebarProvider } from '@/components/SidebarProvider';
import { ClientSessionProvider } from '@/lib/imports';

export const metadata = {
  title: 'Ethiopian Orthodox Sunday School',
  description: 'Attendance management for Sunday School',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientSessionProvider>
          <SidebarProvider>
            <div className="flex flex-col min-h-screen">
              <NavBar />
              {children}
            </div>
          </SidebarProvider>
        </ClientSessionProvider>
      </body>
    </html>
  );
}