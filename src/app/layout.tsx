// src/app/layout.tsx

import "./globals.css";
import NavBar from "@/components/NavBar";
import { SidebarProvider } from "@/components/SidebarProvider";
import { ClientSessionProvider } from "@/lib/imports";

export const metadata = {
  title: "Ethiopian Orthodox Sunday School",
  description: "Attendance management for Sunday School",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <ClientSessionProvider>
          <SidebarProvider>
            <div className="flex min-h-screen flex-col">
              <NavBar />
              <main className="flex min-h-0 w-full max-w-none flex-1 flex-col md:min-h-[calc(100vh-var(--app-navbar-height))]">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </ClientSessionProvider>
      </body>
    </html>
  );
}
