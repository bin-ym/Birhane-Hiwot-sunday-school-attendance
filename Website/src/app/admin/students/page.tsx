"use client";
import { useEffect, useState } from "react";
import OldStudent from '../../register/old/page';
const PAGE_SIZE = 10;
function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export default function AdminStudents() {
  return <OldStudent />;
} 