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
  const gradeOptions =
    userRole === "Admin" && formData.Age >= 17 && formData.Age <= 20
      ? [
          { value: GRADES[7], label: GRADES[7] }, // ሰባተኛ ክፍል ጥዋት
          { value: GRADES[8], label: GRADES[8] }, // ሰባተኛ ክፍል ከሰዓት
        ]
      : userRole === "Admin" || (userRole === "Attendance Facilitator" && !student)
      ? GRADES.map((grade) => ({ value: grade, label: grade }))
      : [{ value: formData.Grade || "", label: formData.Grade || "None" }];

  return (
    <section className="space-y-6 bg-white p-6 rounded-lg shadow-md mt-6">
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