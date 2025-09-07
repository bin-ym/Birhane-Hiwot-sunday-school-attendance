"use client";
import React from "react";

export default function FacilitatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
} 