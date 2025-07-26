// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { ClientSessionProvider, NavBar } from '../lib/imports';

export const metadata: Metadata = {
  title: 'Ethiopian Orthodox Sunday School',
  description: 'Attendance management for Sunday School',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientSessionProvider>
          <NavBar />
          <section className="container mx-auto p-6">{children}</section>
        </ClientSessionProvider>
      </body>
    </html>
  );
}