// src/components/StudentForm.tsx

"use client";

  import { useState, useMemo } from "react";
  import { Button } from "@/components/ui/button";
  import { toast } from "react-hot-toast";
  import { Student, UserRole } from "@/lib/models";
  import { PersonalInfoSection } from "@/components/PersonalInfoSection";
  import { AcademicInfoSection } from "@/components/AcademicInfoSection";
  import { useStudentForm } from "@/lib/hooks/useStudentForm";
  import { getCurrentEthiopianYear, getGradeNumber } from "@/lib/utils";
  import { Toaster } from "react-hot-toast";

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
      setFormData,
      handleChange,
      handleSubmit,
      errors,
      loading,
      isLoadingUniqueID,
      error,
      academicYears,
      validateSection,
      handleRequestAdmin,
      isRequestingAdmin,
      isLatestAgeSuggestionRestricted, // NEW: Get this flag from hook
    } = useStudentForm(student, onSave, userRole);

    const [currentSection, setCurrentSection] = useState<"personal" | "academic">(
      "personal"
    );
    const hasErrors = Object.values(errors).some((err) => !!err);

    // Define restricted grades here for consistent use in the component
    const restrictedGradesForFacilitator = useMemo(() => [4, 6, 8, 12], []);

    // Helper: numeric grade for a given Amharic/listed grade
    const getGradeNumberFromName = (name: string) => {
      // Use new numeric mapper
      return getGradeNumber(name);
    };

    // shouldShowRequestAdminButton: either age-based restriction or manual restricted-grade selection
    const isCurrentGradeManuallyRestricted =
      userRole === "Attendance Facilitator" &&
      !student &&
      formData.Grade &&
      restrictedGradesForFacilitator.includes(
        getGradeNumberFromName(formData.Grade)
      );

    const shouldShowRequestAdminButton = useMemo(
      () => isLatestAgeSuggestionRestricted || isCurrentGradeManuallyRestricted,
      [isLatestAgeSuggestionRestricted, isCurrentGradeManuallyRestricted]
    );

    // This is the original handleNext function
    const handleNext = () => {
      if (typeof validateSection !== "function") {
        console.error("validateSection is not a function");
        return;
      }

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
      } else {
        console.error(
          "Validation errors in Personal Info section:",
          sectionErrors
        );
        // Optionally show a toast
      }
    };

    // Both roles can create new students and edit existing ones
    const canEdit = userRole === "Admin" || userRole === "Attendance Facilitator";

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
        <Toaster position="top-right" />
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
                handleChangeAction={handleChange}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
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

                {/* Warning Banner: Show if the button logic is true */}
                {shouldShowRequestAdminButton && !isRequestingAdmin && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-responsive font-semibold">
                      ⚠️ Restricted Grade Selected
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      The selected grade is restricted for Attendance Facilitators.
                      You need admin approval to register students in this grade.
                      Please use the &quot;Request Admin Approval&quot; button below.
                    </p>
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
                  disabled={loading || hasErrors}
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
                      ⟵ Back
                    </Button>
                  )}

                  {/* Progress indicator */}
                  <div className="flex items-center hidden sm:flex">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState("personal")}`} />
                    <div className="mx-2 w-8 h-1 bg-blue-200"></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getProgressState("academic")}`} >
                      2
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className="btn-responsive bg-white hover:bg-gray-50 text-gray-700 border-gray-300 px-6 py-3 rounded-lg transition-all w-full sm:w-auto"
                  >
                    Cancel
                  </Button>

                  {/* Button logic: show Request Admin if needed, otherwise normal submit */}
                  {!student && userRole === "Attendance Facilitator" && shouldShowRequestAdminButton ? (
                    <Button
                      type="button"
                      onClick={async () => {
                        // Pre-validate required fields before submitting admin request
                        const requiredFields: (keyof Omit<Student, "_id">)[] = [
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
                          "Occupation",
                          "Grade",
                          "Academic_Year",
                          "Address",
                        ];

                        // Use the hook-provided validateSection if available
                        const errs =
                          (validateSection as any) &&
                          validateSection(formData, requiredFields);
                        const hasErrors =
                          errs && Object.values(errs).some((v: any) => !!v);

                        if (hasErrors) {
                          const firstError = Object.values(errs)[0] as string;
                          toast.error(firstError || "Please fill all required fields before submitting.");
                          return;
                        }

                        // If no errors, proceed
                        handleRequestAdmin(formData);
                      }}
                      disabled={loading || hasErrors || isRequestingAdmin}
                      className={`btn-responsive px-8 py-3 rounded-lg transition-all shadow-md flex items-center space-x-2 w-full sm:w-auto justify-center ${
                        loading || hasErrors || isRequestingAdmin
                          ? "bg-orange-400 cursor-not-allowed"
                          : "bg-orange-600 hover:bg-orange-700 text-white"
                      }`}
                      aria-label="Request admin approval"
                    >
                      {isRequestingAdmin ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>Requesting...</span>
                        </>
                      ) : (
                        <>
                          <span>🔔</span>
                          <span>Request Admin Approval</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading || hasErrors}
                      className={`btn-responsive px-8 py-3 rounded-lg transition-all shadow-md flex items-center space-x-2 w-full sm:w-auto justify-center ${
                        loading || hasErrors
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>Saving...</span>
                        </>
                      ) : student ? (
                        "Update Student"
                      ) : (
                        "Add Student"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Error summary for academic section */}
            {error && currentSection === "academic" && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 mt-4">
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