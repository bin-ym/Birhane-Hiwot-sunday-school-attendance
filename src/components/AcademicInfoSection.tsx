// src/components/AcademicInfoSection.tsx
"use client";
import { useEffect, useMemo } from "react";
import { FormField } from "@/components/ui/FormField";
import { Student, UserRole } from "@/lib/models";
import { schools, addresses, GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear, mapAgeToGrade } from "@/lib/utils";

interface AcademicInfoSectionProps {
  formData: Omit<Student, "_id">;
  errors: Partial<Record<keyof Omit<Student, "_id">, string>>;
  handleChangeAction: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  isLoadingUniqueID: boolean;
  student: Student | null;
  academicYears: number[];
  userRole: UserRole;
  canEdit: boolean;
  isReadOnly?: boolean;
  loading?: boolean;
}

export function AcademicInfoSection({
  formData,
  errors,
  handleChangeAction: handleChange,
  isLoadingUniqueID,
  student,
  academicYears,
  userRole,
  canEdit,
  isReadOnly = false,
  loading = false,
}: AcademicInfoSectionProps) {
  const currentEthiopianYear = getCurrentEthiopianYear();
  const occupationOptions = [
    { value: "Student", label: "Student" },
    { value: "Worker", label: "Worker" },
  ];

  const classOptions = [...Array(12)]
    .map((_, i) => ({ value: `Grade ${1 + i}`, label: `Grade ${1 + i}` }))
    .concat({ value: "University", label: "University" });

  const educationalBackgroundOptions = [
    { value: "1-12", label: "Grades 1-12" },
    { value: "ኮሌጅ/ዩኒቨርስቲ", label: "ኮሌጅ/ዩኒቨርስቲ" },
    { value: "ዲፕሎማ", label: "ዲፕሎማ" },
    { value: "ድግሪ", label: "ድግሪ" },
    { value: "ማስትርስ", label: "ማስትርስ" },
  ];

  const placeOfWorkOptions = [
    { value: "Government", label: "Government" },
    { value: "Private", label: "Private" },
  ];

  // Grades that Attendance Facilitators cannot assign
  const restrictedGradesForFacilitator = useMemo(() => [4, 6, 8, 12], []);

  // Determine if field is disabled
  const isFieldDisabled = !canEdit || isReadOnly;

  // For facilitators, disable grade selection if not editing
  const isGradeDisabled =
    isFieldDisabled || (userRole === "Attendance Facilitator" && !student);

  // Get allowed grades based on role and edit mode
  const getAllowedGrades = () => {
    if (student) {
      // For editing existing students, show only current grade
      return [
        {
          value: formData.Grade || "",
          label: formData.Grade || "Select Grade",
        },
      ];
    }

    if (userRole === "Attendance Facilitator") {
      // Filter out restricted grades for facilitators
      return GRADES.filter((grade) => {
        const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || "0");
        return !restrictedGradesForFacilitator.includes(gradeNumber);
      }).map((grade) => ({ value: grade, label: grade }));
    }

    // Admin can access all grades
    return GRADES.map((grade) => ({ value: grade, label: grade }));
  };

  const gradeOptions = getAllowedGrades();

  // Calculate suggested grade based on age
  const suggestedGrade = formData.Age > 0 ? mapAgeToGrade(formData.Age) : "";

  // Update grade when age changes for Attendance Facilitators
  useEffect(() => {
    // Only auto-update for Attendance Facilitators and new students
    if (userRole === "Attendance Facilitator" && !student && formData.Age > 0) {
      // Check if the grade needs to be updated (either it's empty or different from suggestion)
      const shouldUpdate = !formData.Grade || formData.Grade !== suggestedGrade;

      if (suggestedGrade && shouldUpdate) {
        // Check if the grade is restricted
        const gradeNumber = parseInt(suggestedGrade.match(/\d+/)?.[0] || "0");
        if (!restrictedGradesForFacilitator.includes(gradeNumber)) {
          // Create a synthetic event to update the grade
          const event = {
            target: {
              name: "Grade",
              value: suggestedGrade,
            },
          } as React.ChangeEvent<HTMLSelectElement>;

          // Update the grade
          handleChange(event);
          console.log(
            `Auto-updating grade to ${suggestedGrade} based on age ${formData.Age}`
          );
        }
      }
    }
  }, [
    formData.Age,
    formData.Grade,
    userRole,
    student,
    handleChange,
    restrictedGradesForFacilitator,
    suggestedGrade,
  ]);

  return (
    <section
      className={`space-y-6 bg-white p-6 rounded-lg shadow-md mt-6 ${
        isReadOnly ? "border-2 border-gray-200" : ""
      }`}
    >
      <h4 className="text-lg sm:text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 mb-4">
        Academic & School Information
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Occupation field */}
        <FormField
          label="Occupation"
          name="Occupation"
          type="select"
          value={formData.Occupation}
          onChange={handleChange}
          error={errors.Occupation}
          required
          options={occupationOptions}
          className="text-responsive"
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
            isFieldDisabled
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }`}
          readOnly={isFieldDisabled}
          disabled={isFieldDisabled}
        />

        {/* Conditional fields based on occupation */}
        {formData.Occupation === "Student" && (
          <>
            <FormField
              label="Class (World School)"
              name="Class"
              type="select"
              value={formData.Class}
              onChange={handleChange}
              error={errors.Class}
              required
              options={classOptions}
              className="text-responsive"
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
                isFieldDisabled
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
              readOnly={isFieldDisabled}
              disabled={isFieldDisabled}
            />
            <FormField
              label="School"
              name="School"
              type="select"
              value={formData.School}
              onChange={handleChange}
              error={errors.School}
              required
              options={schools}
              className="text-responsive"
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
                isFieldDisabled
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
              readOnly={isFieldDisabled}
              disabled={isFieldDisabled}
            />
            {formData.School === "Other" && (
              <FormField
                label="Other School"
                name="School_Other"
                value={formData.School_Other}
                onChange={handleChange}
                error={errors.School_Other}
                required
                className="text-responsive"
                inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
                  isFieldDisabled
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                }`}
                readOnly={isFieldDisabled}
                disabled={isFieldDisabled}
              />
            )}
          </>
        )}

        {formData.Occupation === "Worker" && (
          <>
            <FormField
              label="Educational Background"
              name="Educational_Background"
              type="select"
              value={formData.Educational_Background}
              onChange={handleChange}
              error={errors.Educational_Background}
              required
              options={educationalBackgroundOptions}
              className="text-responsive"
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
                isFieldDisabled
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
              readOnly={isFieldDisabled}
              disabled={isFieldDisabled}
            />
            <FormField
              label="Place of Work"
              name="Place_of_Work"
              type="select"
              value={formData.Place_of_Work}
              onChange={handleChange}
              error={errors.Place_of_Work}
              required
              options={placeOfWorkOptions}
              className="text-responsive"
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
                isFieldDisabled
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
              readOnly={isFieldDisabled}
              disabled={isFieldDisabled}
            />
          </>
        )}

        {/* Address field */}
        <FormField
          label="Address"
          name="Address"
          type="select"
          value={formData.Address}
          onChange={handleChange}
          error={errors.Address}
          required
          options={addresses}
          className="text-responsive"
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
            isFieldDisabled
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }`}
          readOnly={isFieldDisabled}
          disabled={isFieldDisabled}
        />
        {formData.Address === "Other" && (
          <FormField
            label="Other Address"
            name="Address_Other"
            value={formData.Address_Other}
            onChange={handleChange}
            error={errors.Address_Other}
            required
            className="text-responsive"
            inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
              isFieldDisabled
                ? "bg-gray-100 cursor-not-allowed"
                : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            readOnly={isFieldDisabled}
            disabled={isFieldDisabled}
          />
        )}

        {/* Grade field with proper restrictions */}
        <FormField
          label="Grade (Sunday School)"
          name="Grade"
          type="select"
          value={formData.Grade || ""}
          onChange={handleChange}
          error={errors.Grade}
          required
          options={gradeOptions}
          className="text-responsive"
          inputClassName={`w-full p-3 border ${
            userRole === "Attendance Facilitator" && !student && formData.Grade
              ? "border-green-300 bg-green-50"
              : "border-gray-300"
          } rounded-lg transition-all ${
            isFieldDisabled
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }`}
          readOnly={isGradeDisabled}
          disabled={isGradeDisabled}
        />

        {/* Academic Year field */}
        <FormField
          label="Academic Year (Ethiopian Calendar)"
          name="Academic_Year"
          value={String(currentEthiopianYear)}
          readOnly
          disabled
          className="text-responsive"
          inputClassName="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />

        {/* Unique ID field */}
        <FormField
          label="Unique ID"
          name="Unique_ID"
          value={formData.Unique_ID || ""}
          readOnly
          disabled={isLoadingUniqueID || isFieldDisabled}
          error={errors.Unique_ID}
          className="text-responsive"
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
            isLoadingUniqueID || isFieldDisabled
              ? "bg-gray-100 cursor-not-allowed"
              : "bg-green-50 border-green-300"
          }`}
        />
      </div>

      {/* Warning message for restricted grades */}
      {userRole === "Attendance Facilitator" &&
  !student &&
  formData.Grade &&
  restrictedGradesForFacilitator.includes(
    parseInt(formData.Grade.match(/\d+/)?.[0] || "0")
  ) && (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mt-4">
      <div className="flex items-start space-x-2">
        <div className="text-red-600 mt-0.5">🚫</div>
        <div>
          <p className="text-sm font-semibold text-red-800">
            Access Restricted
          </p>
          <p className="text-sm text-red-700">
            Grade {formData.Grade.match(/\d+/)?.[0]} is restricted for Attendance Facilitators. 
            Please select a valid grade or contact an administrator.
          </p>
          <button
            type="button"
            onClick={() => handleChange({ target: { name: "Grade", value: "" } } as any)}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear Grade
          </button>
        </div>
      </div>
    </div>
  )}

      {/* Suggested grade button for facilitators */}
      {userRole === "Attendance Facilitator" &&
        !student &&
        formData.Age > 0 &&
        !isGradeDisabled &&
        suggestedGrade && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                // Create a synthetic event to pass to handleChange
                const event = {
                  target: {
                    name: "Grade",
                    value: suggestedGrade,
                  },
                } as React.ChangeEvent<HTMLSelectElement>;
                handleChange(event);
              }}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm px-3 py-1.5 rounded-md flex items-center space-x-1"
            >
              <span>💡</span>
              <span>Use Suggested Grade ({suggestedGrade})</span>
            </button>
          </div>
        )}
    </section>
  );
}