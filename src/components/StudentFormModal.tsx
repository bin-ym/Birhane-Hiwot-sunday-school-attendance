// src/components/StudentFormModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Student } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";

interface StudentFormModalProps {
  student: Student | null;
  onClose: () => void;
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>;
}

export function StudentFormModal({ student, onClose, onSave }: StudentFormModalProps) {
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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4">{student ? "Edit Student" : "Add Student"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <PersonalInfoSection formData={formData} errors={errors} handleChange={handleChange} />
          <AcademicInfoSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            isLoadingUniqueID={isLoadingUniqueID}
            student={student}
            academicYears={academicYears}
          />
          {isLoadingUniqueID && <p className="md:col-span-2 text-gray-500 text-xs mt-1">Generating ID...</p>}
          {error && <div className="md:col-span-2 text-red-500 text-sm">{error}</div>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || isLoadingUniqueID} aria-label="Cancel">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading || isLoadingUniqueID} aria-label={student ? "Update student" : "Add student"}>
              {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}