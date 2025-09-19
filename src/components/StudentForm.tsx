"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Student, UserRole } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";
import { getCurrentEthiopianYear } from "@/lib/utils";

interface StudentFormProps {
  student: Student | null;
  onSave: (data: Omit<Student, "_id">) => Promise<void>;
  onCancel: () => void;
  title?: string;
  userRole: UserRole;
}

export function StudentForm({
  student,
  onSave,
  onCancel,
  title,
  userRole,
}: StudentFormProps) {
  const currentEthiopianYear = getCurrentEthiopianYear();
  const {
    formData,
    handleChange,
    handleSubmit,
    errors,
    loading,
    isLoadingUniqueID,
    error,
    academicYears,
    validateSection,
  } = useStudentForm(student, onSave, userRole);
  const [currentSection, setCurrentSection] = useState<"personal" | "academic">("personal");

  const handleNext = () => {
    const personalFields: (keyof Omit<Student, "_id">)[] = [
      "First_Name",
      "Father_Name",
      "Grandfather_Name",
      "Mothers_Name",
      "Christian_Name",
      "DOB_Date",
      "DOB_Month",
      "DOB_Year",
      "Sex",
      "Phone_Number",
    ];
    const sectionErrors = validateSection(formData, personalFields);
    if (Object.keys(sectionErrors).length === 0) {
      setCurrentSection("academic");
    }
  };

  return (
    <main className="flex-1 p-8 bg-gray-50">
      <div className="w-full">
        {title && (
          <h1 className="text-responsive text-blue-900 mb-6 font-bold text-2xl sm:text-3xl">
            {title}
          </h1>
        )}
        <form onSubmit={handleSubmit}>
          {currentSection === "personal" && (
            <PersonalInfoSection
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              onNext={handleNext}
              userRole={userRole}
            />
          )}
          {currentSection === "academic" && (
            <AcademicInfoSection
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              isLoadingUniqueID={isLoadingUniqueID}
              student={student}
              academicYears={[currentEthiopianYear]}
              userRole={userRole}
            />
          )}
          {isLoadingUniqueID && (
            <p className="mt-4 text-gray-500 text-responsive">
              Generating ID...
            </p>
          )}
          {error && (
            <p className="mt-4 text-red-500 text-responsive">{error}</p>
          )}
          {currentSection === "academic" && (
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentSection("personal")}
                disabled={loading || userRole !== "Admin"}
                className="btn-responsive bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-all"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={loading || userRole !== "Admin"}
                className="btn-responsive bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || userRole !== "Admin"}
                className="btn-responsive bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}