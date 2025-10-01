//src/components/StudentForm.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Student, UserRole } from "@/lib/models";
import { PersonalInfoSection } from "@/components/PersonalInfoSection";
import { AcademicInfoSection } from "@/components/AcademicInfoSection";
import { useStudentForm } from "@/lib/hooks/useStudentForm";
import { getCurrentEthiopianYear, mapAgeToGrade } from "@/lib/utils";

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
    setFormData, // ✅ ensure useStudentForm returns setFormData
    handleChange,
    handleSubmit,
    errors,
    loading,
    isLoadingUniqueID,
    error,
    academicYears,
    validateSection,
  } = useStudentForm(student, onSave, userRole);

  const [currentSection, setCurrentSection] = useState<"personal" | "academic">(
    "personal"
  );
  const hasErrors = Object.values(errors).some((err) => !!err);

  // ✅ Auto-assign Grade when Age changes (but allow override)
  useEffect(() => {
    if (!formData.Grade && formData.Age) {
      const grade = mapAgeToGrade(formData.Age);
      setFormData((prev) => ({ ...prev, Grade: grade }));
    }
  }, [formData.Age, formData.Grade, setFormData]);

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

  // Both roles can create new students and edit existing ones
  const canEdit = userRole === "Admin" || userRole === "Attendance Facilitator";

  // Show role-based information for new student creation
  const showRoleInfo = !student && canEdit;

  // Progress indicator logic
  const getProgressState = (section: "personal" | "academic") => {
    if (currentSection === section) {
      return "bg-blue-600 text-white"; // Current section
    } else if (currentSection === "personal" && section === "academic") {
      return "bg-gray-200 text-gray-600"; // Future section
    } else {
      return "bg-green-600 text-white"; // Completed section
    }
  };

  return (
    <main className="flex-1 p-8 bg-gray-50">
      <div className="w-full max-w-4xl mx-auto">
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
              canEdit={canEdit}
              isReadOnly={!canEdit}
              loading={loading}
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
              canEdit={canEdit}
              isReadOnly={!canEdit}
              loading={loading}
            />
          )}

          {/* Loading and Error Messages */}
          {currentSection === "academic" && (
            <div className="mt-6 space-y-3">
              {isLoadingUniqueID && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 text-responsive">
                    Generating Unique ID for {userRole}...
                  </span>
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-responsive">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation and Action Buttons */}
          {currentSection === "personal" && canEdit && (
            <div className="flex justify-end mt-6">
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                className="btn-responsive bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all shadow-md"
              >
                Next →
              </Button>
            </div>
          )}

          {currentSection === "academic" && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-4 bg-gray-50 rounded-lg border">
              {/* Navigation */}
              <div className="flex items-center gap-3">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentSection("personal")}
                    disabled={loading}
                    className="btn-responsive bg-white hover:bg-gray-50 text-gray-700 border-gray-300 px-4 py-2 rounded-lg transition-all"
                  >
                    ← Back
                  </Button>
                )}

                {/* Progress indicator */}
                <div className="flex items-center hidden sm:flex">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState(
                      "personal"
                    )}`}
                  >
                    1
                  </div>
                  <div className="mx-2 w-8 h-1 bg-blue-200"></div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState(
                      "academic"
                    )}`}
                  >
                    2
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="btn-responsive bg-white hover:bg-gray-50 text-gray-700 border-gray-300 px-6 py-3 rounded-lg transition-all"
                >
                  Cancel
                </Button>

                {canEdit && (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading || hasErrors}
                    className={`btn-responsive px-8 py-3 rounded-lg transition-all shadow-md flex items-center space-x-2 ${
                      loading || hasErrors
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : student ? (
                      "Update Student"
                    ) : (
                      "Add Student"
                    )}
                  </Button>
                )}

                {/* Role indicator */}
                {!student && (
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      userRole === "Admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {userRole} Mode
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error summary for academic section */}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
              <p className="font-semibold">Please fix these errors:</p>
              <ul className="list-disc list-inside">
                {Object.entries(errors).map(([field, msg]) =>
                  msg ? <li key={field}>{msg}</li> : null
                )}
              </ul>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
