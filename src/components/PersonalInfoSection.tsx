// src/components/PersonalInfoSection.tsx
import { FormField } from "@/components/ui/FormField";
import { Student } from "@/lib/models";

interface PersonalInfoSectionProps {
  formData: Omit<Student, "_id">;
  errors: Partial<Record<keyof Omit<Student, "_id">, string>>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export function PersonalInfoSection({
  formData,
  errors,
  handleChange,
}: PersonalInfoSectionProps) {
  const sexOptions = ["Male", "Female"];
  return (
    <>
      <div className="md:col-span-2">
        <h4 className="text-lg font-semibold text-blue-700 border-b pb-1 mb-2">
          Personal Information
        </h4>
      </div>
      <FormField
        label="First Name"
        name="First_Name"
        value={formData.First_Name}
        onChange={handleChange}
        error={errors.First_Name}
        required
      />
      <FormField
        label="Father Name"
        name="Father_Name"
        value={formData.Father_Name}
        onChange={handleChange}
        error={errors.Father_Name}
        required
      />
      <FormField
        label="Grandfather Name"
        name="Grandfather_Name"
        value={formData.Grandfather_Name}
        onChange={handleChange}
        error={errors.Grandfather_Name}
        required
      />
      <FormField
        label="Mother's Name"
        name="Mothers_Name"
        value={formData.Mothers_Name}
        onChange={handleChange}
        error={errors.Mothers_Name}
        required
      />
      <FormField
        label="Christian Name"
        name="Christian_Name"
        value={formData.Christian_Name}
        onChange={handleChange}
        error={errors.Christian_Name}
        required
      />
      <div className="flex gap-4">
        <FormField
          label="DOB Date"
          name="DOB_Date"
          value={formData.DOB_Date}
          onChange={handleChange}
          error={errors.DOB_Date}
          required
        />
        <FormField
          label="DOB Month"
          name="DOB_Month"
          type="select"
          value={formData.DOB_Month}
          onChange={handleChange}
          error={errors.DOB_Month}
          required
          options={Array.from({ length: 13 }, (_, i) => (i + 1).toString())}
        />
        <FormField
          label="DOB Year"
          name="DOB_Year"
          value={formData.DOB_Year}
          onChange={handleChange}
          error={errors.DOB_Year}
          required
        />
      </div>
      <FormField
        label="Age (Calculated)"
        name="Age"
        value={formData.Age.toString()}
        type="number"
        readOnly
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
      />
      <FormField
        label="Phone Number"
        name="Phone_Number"
        value={formData.Phone_Number}
        onChange={handleChange}
        error={errors.Phone_Number}
        required
      />
    </>
  );
}
