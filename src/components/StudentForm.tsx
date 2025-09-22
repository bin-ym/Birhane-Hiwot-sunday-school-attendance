//src/components/StudentForm.tsx

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

        {/* Role-based information for new student registration */}
        {showRoleInfo && (
          <div className={`p-4 rounded-lg mb-6 ${
            userRole === "Admin" 
              ? "bg-blue-50 border-2 border-blue-200" 
              : "bg-green-50 border-2 border-green-200"
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 p-2 rounded-full ${
                userRole === "Admin" 
                  ? "bg-blue-100 text-blue-600" 
                  : "bg-green-100 text-green-600"
              }`}>
                {userRole === "Admin" ? "👑" : "📋"}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-sm ${
                  userRole === "Admin" ? "text-blue-800" : "text-green-800"
                }`}>
                  {userRole} Registration Access
                </h3>
                <p className={`text-sm mt-1 ${
                  userRole === "Admin" 
                    ? "text-blue-700" 
                    : "text-green-700"
                }`}>
                  {userRole === "Admin" 
                    ? "You have full access to register students for all grades."
                    : "You can register students for most grades. Age-based suggestions available. Note: Grades 4, 6, 8, and 12 are admin-only."
                  }
                </p>
                {userRole === "Attendance Facilitator" && (
                  <p className="text-xs text-green-600 mt-1 font-medium bg-green-100 px-2 py-1 rounded inline-block">
                    Available: All grades except 4, 6, 8, 12
                  </p>
                )}
              </div>
            </div>
          </div>
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
              loading={loading} // Pass loading prop
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
              loading={loading} // Pass loading prop
            />
          )}

          {/* Loading and Error Messages */}
          {currentSection === "academic" && (
            <div className="mt-6 space-y-3">
              {isLoadingUniqueID && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 text-responsive">Generating Unique ID for {userRole}...</span>
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
                
                {/* Progress indicator - Fixed logic */}
                <div className="flex items-center hidden sm:flex">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState("personal")}`}>
                    1
                  </div>
                  <div className="mx-2 w-8 h-1 bg-blue-200"></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState("academic")}`}>
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
                    disabled={loading || Object.keys(errors).length > 0}
                    className={`btn-responsive px-8 py-3 rounded-lg transition-all shadow-md flex items-center space-x-2 ${
                      loading || Object.keys(errors).length > 0
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
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    userRole === "Admin"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                    {userRole} Mode
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error summary for academic section */}
          {currentSection === "academic" && Object.keys(errors).length > 0 && canEdit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-red-800 font-semibold mb-2 text-sm">Please fix these errors:</h4>
              <div className="grid grid-cols-1 gap-1 text-sm text-red-700">
                {Object.entries(errors).map(([field, errorMsg]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <span className="text-red-500">•</span>
                    <span>{errorMsg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}