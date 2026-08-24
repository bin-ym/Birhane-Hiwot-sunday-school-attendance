import { Student } from "@/lib/models";
import { getCurrentEthiopianYear, ethiopianToGregorian, gregorianToEthiopian, isEthiopianLeapYear } from "@/lib/utils";
import { GRADES } from "@/lib/constants";

export function calculateAge(date: number, month: number, year: number): number {
  // Validate inputs
  if (!year || isNaN(year) || !month || isNaN(month) || !date || isNaN(date)) {
    return 0;
  }

  // Validate Ethiopian date
  const isPagume = month === 13;
  const maxDay = isEthiopianLeapYear(year) ? (isPagume ? 6 : 30) : (isPagume ? 5 : 30);
  if (month < 1 || month > 13 || date < 1 || date > maxDay) {
    return 0;
  }

  try {
    // Convert Ethiopian DOB to Gregorian
    const birthDate = ethiopianToGregorian(year, month, date);
    const today = new Date();
    
    // Convert today's date to Ethiopian for comparison
    const { year: currentYear, month: currentMonth, day: currentDay } = gregorianToEthiopian(today);
    
    let age = currentYear - year;
    // Adjust age if birthday hasn't occurred this year
    if (month > currentMonth || (month === currentMonth && date > currentDay)) {
      age--;
    }
    
    return age >= 0 ? age : 0;
  } catch (error) {
    console.error("Error calculating age:", error);
    return 0;
  }
}

// NEW: Map age to suggested grade
export function mapAgeToGrade(age: number): string {
  if (age < 7) return GRADES[0];      // Grade 1
  if (age <= 8) return GRADES[1];     // Grade 2
  if (age <= 10) return GRADES[2];    // Grade 3
  if (age <= 12) return GRADES[3];    // Grade 4
  if (age <= 14) return GRADES[4];    // Grade 5
  if (age <= 16) return GRADES[5];    // Grade 6
  if (age <= 18) return GRADES[6];    // Grade 7
  if (age <= 25) return GRADES[7];    // Grade 8
  return GRADES[8];                   // Adult
}

export function validateStudentForm(formData: Omit<Student, "_id">, isNew: boolean): Partial<Record<keyof Omit<Student, "_id">, string>> {
  const errors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
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

  requiredFields.forEach((field) => {
    if (!formData[field]) {
      errors[field] = `${field.replace("_", " ")} is required`;
    }
  });

  if (formData.Occupation === "Student") {
    if (!formData.Class) errors.Class = "Class is required";
    if (!formData.School) errors.School = "School is required";
    if (formData.School === "Other" && !formData.School_Other) {
      errors.School_Other = "Other School is required";
    }
  }

  if (formData.Occupation === "Worker") {
    if (!formData.Educational_Background) {
      errors.Educational_Background = "Educational Background is required";
    }
    if (!formData.Place_of_Work) {
      errors.Place_of_Work = "Place of Work is required";
    }
  }

  if (formData.Address === "Other" && !formData.Address_Other) {
    errors.Address_Other = "Other Address is required";
  }

  if (isNew && !formData.Unique_ID) {
    errors.Unique_ID = "Unique ID is required";
  }

  // Validate DOB
  if (formData.DOB_Date && formData.DOB_Month && formData.DOB_Year) {
    const year = parseInt(formData.DOB_Year);
    const month = parseInt(formData.DOB_Month);
    const date = parseInt(formData.DOB_Date);
    const isPagume = month === 13;
    const maxDay = isEthiopianLeapYear(year) ? (isPagume ? 6 : 30) : (isPagume ? 5 : 30);
    if (month < 1 || month > 13) {
      errors.DOB_Month = "Invalid month";
    }
    if (date < 1 || date > maxDay) {
      errors.DOB_Date = `Invalid date for ${isPagume ? "Pagumē" : "month"}`;
    }
    if (year < 1900 || year > getCurrentEthiopianYear()) {
      errors.DOB_Year = "Invalid year";
    }
  }

  return errors;
}