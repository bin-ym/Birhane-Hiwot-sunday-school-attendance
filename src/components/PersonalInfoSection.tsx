// src/components/PersonalInfoSection.tsx

"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Student, UserRole } from "@/lib/models";
import { ETHIOPIAN_MONTHS, getCurrentEthiopianYear } from "@/lib/utils";

interface PersonalInfoSectionProps {
  formData: Omit<Student, "_id">;
  errors: Partial<Record<keyof Omit<Student, "_id">, string>>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onNext: () => void;
  userRole: UserRole;
  canEdit: boolean;
  isReadOnly?: boolean;
  loading?: boolean;
}

export function PersonalInfoSection({
  formData,
  errors,
  handleChange,
  onNext,
  userRole,
  canEdit,
  isReadOnly = false,
  loading = false,
}: PersonalInfoSectionProps) {
  const sexOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ];
  const monthOptions = ETHIOPIAN_MONTHS.map((month, i) => ({
    value: (i + 1).toString(),
    label: month,
  }));

  // Determine if field is disabled
  const isFieldDisabled = !canEdit || isReadOnly;

  return (
    <section
      className={`space-y-6 bg-white p-6 rounded-lg shadow-md ${
        isReadOnly ? "border-2 border-gray-200" : ""
      }`}
    >
      <h4 className="text-lg sm:text-xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 mb-4">
        Personal Information
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField
          label="First Name"
          name="First_Name"
          value={formData.First_Name}
          onChange={handleChange}
          error={errors.First_Name}
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

        <FormField
          label="Father Name"
          name="Father_Name"
          value={formData.Father_Name}
          onChange={handleChange}
          error={errors.Father_Name}
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

        <FormField
          label="Grandfather Name"
          name="Grandfather_Name"
          value={formData.Grandfather_Name}
          onChange={handleChange}
          error={errors.Grandfather_Name}
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

        <FormField
          label="Mother's Name"
          name="Mothers_Name"
          value={formData.Mothers_Name}
          onChange={handleChange}
          error={errors.Mothers_Name}
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

        <FormField
          label="Christian Name"
          name="Christian_Name"
          value={formData.Christian_Name}
          onChange={handleChange}
          error={errors.Christian_Name}
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

        <FormField
          label="Sex"
          name="Sex"
          type="select"
          value={formData.Sex}
          onChange={handleChange}
          error={errors.Sex}
          required
          options={sexOptions}
          className="text-responsive"
          inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
            isFieldDisabled
              ? "bg-gray-100 cursor-not-allowed"
              : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }`}
          readOnly={isFieldDisabled}
          disabled={isFieldDisabled}
        />

        <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* ✅ DOB Date restricted to 1–30, 2-digit only */}
          <FormField
            label="DOB Date"
            name="DOB_Date"
            type="number"
            value={formData.DOB_Date}
            onChange={handleChange}
            error={errors.DOB_Date}
            required
            min={1}
            max={30}
            maxLength={2}
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
            label="DOB Month"
            name="DOB_Month"
            type="select"
            value={formData.DOB_Month}
            onChange={handleChange}
            error={errors.DOB_Month}
            required
            options={monthOptions}
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
            label="DOB Year"
            name="DOB_Year"
            type="number"
            value={formData.DOB_Year}
            onChange={handleChange}
            error={errors.DOB_Year}
            required
            min={1900}
            max={getCurrentEthiopianYear()}
            maxLength={4}
            className="text-responsive"
            inputClassName={`w-full p-3 border border-gray-300 rounded-lg transition-all ${
              isFieldDisabled
                ? "bg-gray-100 cursor-not-allowed"
                : "focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            readOnly={isFieldDisabled}
            disabled={isFieldDisabled}
          />
        </div>

        <FormField
          label="Age (Calculated)"
          name="Age"
          value={formData.Age.toString()}
          type="number"
          readOnly
          disabled
          className="text-responsive"
          inputClassName="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />

        <FormField
          label="Phone Number"
          name="Phone_Number"
          value={formData.Phone_Number}
          onChange={handleChange}
          error={errors.Phone_Number}
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
      </div>
    </section>
  );
}
