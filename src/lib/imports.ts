// src/lib/imports.ts
export { useState, useEffect, useRef } from 'react';
export { default as Link } from 'next/link';
export { useRouter, useParams } from 'next/navigation';
export * as XLSX from 'xlsx';
export { saveAs } from 'file-saver';
export interface Attendance {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
}
export { default as AttendanceTable } from '../components/AttendanceTable';
export { default as NavBar } from '../components/NavBar';
export { default as ClientSessionProvider } from '../components/ClientSessionProvider';
export { signIn, signOut, useSession } from 'next-auth/react';