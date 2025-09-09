// src/lib/formUtils.ts
import { Student } from "@/lib/models";
import { isEthiopianLeapYear, ETHIOPIAN_MONTHS, getTodayEthiopianDateISO } from "@/lib/utils";

export function calculateAge(day: number, month: number, year: number): number {
  const { [year]: currentYear } = getTodayEthiopianDateISO().split("-").map(Number);
  return currentYear - year;
}

export function validateStudentForm(
  formData: Omit<Student, "_id">,
  isNew: boolean
): Partial<Record<keyof Omit<Student, "_id">, string>> {
  const errors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
  const textFields: (keyof Omit<Student, "_id">)[] = [
    "First_Name",
    "Father_Name",
    "Grandfather_Name",
    "Mothers_Name",
    "Christian_Name",
    "Sex",
    "Occupation",
    "Address",
  ];
  const numberFields: (keyof Omit<Student, "_id">)[] = [
    "DOB_Date",
    "DOB_Month",
    "DOB_Year",
    "Phone_Number",
    "Academic_Year",
  ];

  (Object.keys(formData) as (keyof Omit<Student, "_id">)[]).forEach((key) => {
    if (
      !formData[key] &&
      key !== "School_Other" &&
      key !== "Address_Other" &&
      key !== "Educational_Background" &&
      key !== "Place_of_Work" &&
      key !== "School" &&
      key !== "Age" &&
      key !== "Class" &&
      key !== "Unique_ID"
    ) {
      errors[key] = `${key.replace("_", " ")} is required`;
    }
  });

  if (formData.Occupation === "Student" && !formData.Class) {
    errors.Class = "Class is required for students";
  }

  textFields.forEach((key) => {
    if (formData[key] && /\d/.test(formData[key] as string)) {
      errors[key] = `${key.replace("_", " ")} cannot contain numbers`;
    }
  });

  numberFields.forEach((key) => {
    if (formData[key] && !/^\d+$/.test(formData[key] as string)) {
      errors[key] = `${key.replace("_", " ")} must contain numbers only`;
    }
  });

  if (formData.Academic_Year && !/^\d{4}$/.test(formData.Academic_Year)) {
    errors.Academic_Year = "Academic Year must be a 4-digit number";
  }

  if (formData.Occupation === "Student" && !formData.School) {
    errors.School = "School is required for students";
  }
  if (formData.Occupation === "Worker") {
    if (!formData.Educational_Background) {
      errors.Educational_Background = "Educational Background is required for workers";
    }
    if (!formData.Place_of_Work) {
      errors.Place_of_Work = "Place of Work is required for workers";
    }
  }
  if (formData.Address === "Other" && !formData.Address_Other) {
    errors.Address_Other = "Please specify address";
  }
  if (formData.School === "Other" && !formData.School_Other) {
    errors.School_Other = "Please specify school";
  }
  if (isNew && !formData.Unique_ID) {
    errors.Unique_ID = "ID Number is required";
  }

  // Validate DOB
  if (formData.DOB_Year && formData.DOB_Month && formData.DOB_Date) {
    const year = parseInt(formData.DOB_Year);
    const month = parseInt(formData.DOB_Month);
    const day = parseInt(formData.DOB_Date);
    const isLeap = isEthiopianLeapYear(year);
    const maxDay = month === 13 ? (isLeap ? 6 : 5) : 30;
    if (month < 1 || month > 13) {
      errors.DOB_Month = `Month must be between 1 and 13 (${ETHIOPIAN_MONTHS.join(", ")})`;
    }
    if (day < 1 || day > maxDay) {
      errors.DOB_Date = `Day must be between 1 and ${maxDay} for ${ETHIOPIAN_MONTHS[month - 1]}`;
    }
  }

  return errors;
}