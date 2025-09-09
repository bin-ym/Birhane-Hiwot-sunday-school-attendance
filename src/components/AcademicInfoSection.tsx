// src/components/AcademicInfoSection.tsx
import { FormField } from "@/components/ui/FormField";
import { Student } from "@/lib/models";
import { schools, addresses } from "@/constant";

interface AcademicInfoSectionProps {
  formData: Omit<Student, "_id">;
  errors: Partial<Record<keyof Omit<Student, "_id">, string>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isLoadingUniqueID: boolean;
  student: Student | null;
  academicYears: number[];
}

export function AcademicInfoSection({
  formData,
  errors,
  handleChange,
  isLoadingUniqueID,
  student,
  academicYears,
}: AcademicInfoSectionProps) {
  const occupationOptions = ["Student", "Worker"];
  const classOptions = [...Array(12)].map((_, i) => `Grade ${1 + i}`).concat("University");
  const educationalBackgroundOptions = ["1-8", "9-12", "University"];
  const placeOfWorkOptions = ["Government", "Private"];
  const gradeOptions = [...Array(12)].map((_, i) => `Grade ${1 + i}`);

  return (
    <>
      <div className="md:col-span-2">
        <h4 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-2">Academic & School Information</h4>
      </div>
      <FormField
        label="Occupation"
        name="Occupation"
        type="select"
        value={formData.Occupation}
        onChange={handleChange}
        error={errors.Occupation}
        required
        options={occupationOptions}
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
          />
          {formData.School === "Other" && (
            <FormField
              label="Other School"
              name="School_Other"
              value={formData.School_Other}
              onChange={handleChange}
              error={errors.School_Other}
              required
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
      />
      {formData.Address === "Other" && (
        <FormField
          label="Other Address"
          name="Address_Other"
          value={formData.Address_Other}
          onChange={handleChange}
          error={errors.Address_Other}
          required
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
      />
      <FormField
        label="Academic Year (Ethiopian Calendar)"
        name="Academic_Year"
        type="select"
        value={formData.Academic_Year}
        onChange={handleChange}
        error={errors.Academic_Year}
        required
        options={academicYears.map(String)}
      />
      <FormField
        label="Unique ID"
        name="Unique_ID"
        value={formData.Unique_ID || ""}
        readOnly
        disabled={isLoadingUniqueID || !!student}
        error={errors.Unique_ID}
      />
    </>
  );
}