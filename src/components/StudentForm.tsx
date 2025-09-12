// src/components/StudentForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Student } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";

interface StudentFormProps {
  student: Student | null;
  onCancel: () => void;
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>;
  title?: string;
}

export function StudentForm({ student, onCancel, onSave, title }: StudentFormProps) {
  const {
    formData,
    error,
    loading,
    isLoadingUniqueID,
    errors,
    academicYears,
    handleChange,
    handleSubmit,
  } = useStudentForm(student, onSave);

  return (
    <div className="card-responsive">
      {/* Header */}
      {title && <h1 className="heading-responsive font-serif text-primary mb-6">{title}</h1>}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6"
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
          <p className="lg:col-span-2 text-muted-foreground text-responsive mt-1">
            Generating ID...
          </p>
        )}
        {error && (
          <div className="lg:col-span-2 text-destructive text-responsive">{error}</div>
        )}

        {/* Buttons */}
        <div className="lg:col-span-2 flex flex-col sm:flex-row justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
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
            {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
          </Button>
        </div>
      </form>
    </div>
  );
}