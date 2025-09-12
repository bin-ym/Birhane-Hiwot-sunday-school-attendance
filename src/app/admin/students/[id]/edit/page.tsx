"use client";

import { Button } from "@/components/ui/button";
import { Student } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditStudent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students?id=${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load student");
        }
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setLoadingStudent(false);
      }
    };
    if (id) fetchStudent();
  }, [id]);

  const {
    formData,
    error: formError,
    loading,
    isLoadingUniqueID,
    errors,
    academicYears,
    handleChange,
    handleSubmit,
  } = useStudentForm(student, async (studentData: Omit<Student, "_id">) => {
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...studentData, id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update student");
      }
      router.push("/admin/students");
    } catch (err) {
      throw err;
    }
  });

  const handleCancel = () => router.push("/admin/students");

  if (loadingStudent) {
    return (
      <main className="flex justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-screen-lg bg-white shadow rounded-xl p-6">
          <div className="animate-pulse bg-muted h-8 rounded w-full mb-4"></div>
          <div className="animate-pulse bg-muted h-8 rounded w-3/4"></div>
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="flex justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-screen-md bg-white shadow rounded-xl p-6">
          <div className="text-destructive text-sm mb-4">
            {error || "Student not found"}
          </div>
          <Link
            href="/admin/students"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 inline-block text-sm"
          >
            Back to Students
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex justify-center px-4 sm:px-6 lg:px-8 py-6">
      <div className="w-full max-w-screen-lg bg-white shadow rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary">
            Edit Student: {student.First_Name} {student.Father_Name}
          </h1>
          <Link
            href="/admin/students"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 text-sm sm:text-base text-center"
          >
            Back to Students
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6"
        >
          <PersonalInfoSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
          />
          <AcademicInfoSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            isLoadingUniqueID={isLoadingUniqueID}
            student={student}
            academicYears={academicYears}
          />

          {isLoadingUniqueID && (
            <p className="md:col-span-2 text-muted-foreground text-sm">
              Generating ID...
            </p>
          )}
          {formError && (
            <div className="md:col-span-2 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={loading || isLoadingUniqueID}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || isLoadingUniqueID}
              className="w-full sm:w-auto"
            >
              {loading ? "Saving..." : "Update Student"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}