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

  // Define allowed grades for each role
  const getAllowedGrades = (role: UserRole, isEditing: boolean, age: number): { value: string; label: string }[] => {
    // For editing existing students, show current grade only
    if (isEditing) {
      return [{ value: formData.Grade || "", label: formData.Grade || "None" }];
    }

    // For Admin role - only allow Grade 4, 6, and grades > 8
    if (role === "Admin") {
      return GRADES
        .filter(grade => {
          const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || '0');
          return gradeNumber === 4 || gradeNumber === 6 || gradeNumber > 8;
        })
        .map(grade => ({ value: grade, label: grade }));
    }

    // For Attendance Facilitator role - allow all grades
    if (role === "Attendance Facilitator") {
      return GRADES.map(grade => ({ value: grade, label: grade }));
    }

    // Default: all grades
    return GRADES.map(grade => ({ value: grade, label: grade }));
  };

  const gradeOptions = getAllowedGrades(userRole, !!student, formData.Age);

  return (
    <section className="space-y-6 bg-white p-6 rounded-lg shadow-md mt-6">
      <h4 className="text-lg sm:text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 mb-4">
        Academic & School Information
      </h4>
      
      {/* Role-based grade restriction info */}
      {userRole === "Admin" && !student && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> As an Admin, you can only register students for Grade 4, Grade 6, and grades above 8.
          </p>
        </div>
      )}
      
      {userRole === "Attendance Facilitator" && !student && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800">
            You can register students for all grades.
          </p>
        </div>
      )}

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
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
            !canEdit
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          }`}
          readOnly={!canEdit}
          disabled={!canEdit}
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
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
                !canEdit
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              }`}
              readOnly={!canEdit}
              disabled={!canEdit}
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
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
                !canEdit
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              }`}
              readOnly={!canEdit}
              disabled={!canEdit}
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
                inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
                  !canEdit
                    ? "bg-gray-100 cursor-not-allowed"
                    : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                }`}
                readOnly={!canEdit}
                disabled={!canEdit}
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
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
                !canEdit
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              }`}
              readOnly={!canEdit}
              disabled={!canEdit}
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
              inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
                !canEdit
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              }`}
              readOnly={!canEdit}
              disabled={!canEdit}
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
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
            !canEdit
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          }`}
          readOnly={!canEdit}
          disabled={!canEdit}
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
            inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
              !canEdit
                ? "bg-gray-100 cursor-not-allowed"
                : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              }`}
            readOnly={!canEdit}
            disabled={!canEdit}
          />
        )}
        <FormField
          label="Grade (Sunday School)"
          name="Grade"
          type="select"
          value={formData.Grade}
          onChange={handleChange}
          error={errors.Grade}
          required
          options={gradeOptions}
          readOnly={!canEdit}
          disabled={!canEdit}
          className="text-responsive"
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg ${
            !canEdit
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          }`}
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
          disabled={isLoadingUniqueID || !!student || !canEdit}
          error={errors.Unique_ID}
          className="text-responsive"
          inputClassName="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />
      </div>
    </section>
  );
}