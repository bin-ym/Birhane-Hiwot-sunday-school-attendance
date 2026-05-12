"use client";
import { useParams } from "next/navigation";
import { StudentResultsPanel } from "@/components/StudentResultsPanel";

export default function StudentResults() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <StudentResultsPanel
      studentMongoId={id}
      backHref="/education/students"
      backLabel="Back to students"
    />
  );
}
