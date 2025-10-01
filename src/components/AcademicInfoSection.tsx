//src/components/AcademicInfoSection.tsx

"use client";

import { FormField } from "@/components/ui/FormField";
import { Student, UserRole } from "@/lib/models";
import { schools, addresses, GRADES } from "@/lib/constants";
import { getCurrentEthiopianYear } from "@/lib/utils";

interface AcademicInfoSectionProps {
  formData: Omit<Student, "_id">;
  errors: Partial<Record<keyof Omit<Student, "_id">, string>>;
  handleChange: (
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
  handleChange,
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

  // Define restricted grades for Attendance Facilitators
  const restrictedGradesForFacilitator = [4, 6, 8, 12];

  // Get allowed grades based on role
  const getAllowedGrades = (
    role: UserRole,
    isEditing: boolean
  ): { value: string; label: string }[] => {
    if (isEditing) {
      // For editing existing students, show only current grade
      return [
        {
          value: formData.Grade || "",
          label: formData.Grade || "Select Grade",
        },
      ];
    }

    if (role === "Attendance Facilitator") {
      // Filter out restricted grades for facilitators
      return GRADES.filter((grade) => {
        const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || "0");
        return !restrictedGradesForFacilitator.includes(gradeNumber);
      }).map((grade) => ({ value: grade, label: grade }));
    }

    // Admin can access all grades
    return GRADES.map((grade) => ({ value: grade, label: grade }));
  };

  const gradeOptions =
    userRole === "Admin"
      ? GRADES
      : GRADES.filter((grade) => {
          const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || "0");
          return !restrictedGradesForFacilitator.includes(gradeNumber);
        });

  // Determine if field is disabled
  const isFieldDisabled = !canEdit || isReadOnly;

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

        <FormField
          label="Grade (Sunday School)"
          name="Grade"
          type="select"
          value={formData.Grade || ""}
          onChange={handleChange}
          error={errors.Grade}
          required
          options={getAllowedGrades(userRole, !!student)}
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
          label="Academic Year (Ethiopian Calendar)"
          name="Academic_Year"
          value={String(currentEthiopianYear)}
          readOnly
          disabled
          className="text-responsive"
          inputClassName="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />

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

      {/* Show restricted grades warning if facilitator tries to access restricted grade */}
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
                  You cannot register students for Grade{" "}
                  {formData.Grade.match(/\d+/)?.[0]}. Please select a different
                  grade or contact an administrator.
                </p>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
