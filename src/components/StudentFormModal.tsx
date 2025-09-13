// src/components/StudentForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Student } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";

interface StudentFormProps {
  student: Student | null;
  onSave: (data: Omit<Student, "_id">) => Promise<void>;
  onCancel: () => void;
  title?: string;
}

export function StudentForm({ student, onSave, onCancel, title }: StudentFormProps) {
  const {
    formData,
    handleChange,
    handleSubmit,
    errors,
    loading,
    isLoadingUniqueID,
    error,
    academicYears,
  } = useStudentForm(student, onSave);

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      {title && (
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">
          {title}
        </h1>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
      >
        <PersonalInfoSection formData={formData} errors={errors} handleChange={handleChange} />
        <AcademicInfoSection
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          isLoadingUniqueID={isLoadingUniqueID}
          student={student}
          academicYears={academicYears}
        />

        {isLoadingUniqueID && (
          <p className="md:col-span-2 text-gray-500">Generating ID...</p>
        )}
        {error && <p className="md:col-span-2 text-red-500">{error}</p>}

        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
          </Button>
        </div>
      </form>
    </div>
  );
}