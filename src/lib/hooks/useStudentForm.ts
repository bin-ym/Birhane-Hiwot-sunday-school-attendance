//src/lib/hooks/useStudentForm.ts
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Student, UserRole } from "@/lib/models";
import { calculateAge, validateStudentForm } from "@/lib/formUtils";
import { getCurrentEthiopianYear, isEthiopianLeapYear } from "@/lib/utils";
import { GRADES } from "@/lib/constants";

export function useStudentForm(
  student: Student | null,
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>,
  userRole: UserRole
) {
  const currentEthiopianYear = getCurrentEthiopianYear();
  const [formData, setFormData] = useState<Omit<Student, "_id">>({
    Unique_ID: "",
    First_Name: "",
    Father_Name: "",
    Grandfather_Name: "",
    Mothers_Name: "",
    Christian_Name: "",
    DOB_Date: "",
    DOB_Month: "",
    DOB_Year: "",
    Age: 0,
    Sex: "",
    Phone_Number: "",
    Class: "",
    Occupation: "",
    School: "",
    School_Other: "",
    Educational_Background: "",
    Place_of_Work: "",
    Address: "",
    Address_Other: "",
    Academic_Year: String(currentEthiopianYear),
    Grade: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingUniqueID, setIsLoadingUniqueID] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Student, "_id">, string>>>({});
  const academicYears = [currentEthiopianYear];

  // Restricted grades for Attendance Facilitators
  const restrictedGradesForFacilitator = [4, 6, 8, 12];

  // Validate grade based on user role for new student registration
  const validateGradeByRole = (grade: string, role: UserRole, isEditing: boolean = false): string | null => {
    if (!grade || isEditing) return null;

    const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || '0');
    
    // For Attendance Facilitator - restrict specific grades when creating new students
    if (role === "Attendance Facilitator") {
      if (restrictedGradesForFacilitator.includes(gradeNumber)) {
        return `Attendance Facilitators cannot register students for Grade ${gradeNumber}. Please contact an administrator.`;
      }
    }
    
    // Admin can register all grades
    return null;
  };

  useEffect(() => {
    if (student) {
      setFormData({
        Unique_ID: student.Unique_ID || "",
        First_Name: student.First_Name || "",
        Father_Name: student.Father_Name || "",
        Grandfather_Name: student.Grandfather_Name || "",
        Mothers_Name: student.Mothers_Name || "",
        Christian_Name: student.Christian_Name || "",
        DOB_Date: student.DOB_Date || "",
        DOB_Month: student.DOB_Month || "",
        DOB_Year: student.DOB_Year || "",
        Age: student.Age || 0,
        Sex: student.Sex || "",
        Phone_Number: student.Phone_Number || "",
        Class: student.Class || "",
        Occupation: student.Occupation || "",
        School: student.School || "",
        School_Other: student.School_Other || "",
        Educational_Background: student.Educational_Background || "",
        Place_of_Work: student.Place_of_Work || "",
        Address: student.Address || "",
        Address_Other: student.Address_Other || "",
        Academic_Year: String(currentEthiopianYear),
        Grade: student.Grade || "",
      });
    }
  }, [student, currentEthiopianYear]);

  useEffect(() => {
    if (formData.DOB_Date && formData.DOB_Month && formData.DOB_Year) {
      const date = parseInt(formData.DOB_Date);
      const month = parseInt(formData.DOB_Month);
      const year = parseInt(formData.DOB_Year);

      // Validate DOB
      const isPagume = month === 13;
      const maxDay = isEthiopianLeapYear(year) ? (isPagume ? 6 : 30) : (isPagume ? 5 : 30);
      const dobErrors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
      if (month < 1 || month > 13) {
        dobErrors.DOB_Month = "Invalid month";
      }
      if (date < 1 || date > maxDay) {
        dobErrors.DOB_Date = `Invalid date for ${isPagume ? "Pagumē" : "month"}`;
      }
      if (year < 1900 || year > currentEthiopianYear) {
        dobErrors.DOB_Year = "Invalid year";
      }

      setErrors((prev) => ({
        ...prev,
        DOB_Date: dobErrors.DOB_Date || "",
        DOB_Month: dobErrors.DOB_Month || "",
        DOB_Year: dobErrors.DOB_Year || "",
      }));

      if (Object.keys(dobErrors).length === 0) {
        const age = calculateAge(date, month, year);
        if (age !== formData.Age) {
          setFormData((prev) => ({ ...prev, Age: age }));
        }
      } else if (formData.Age !== 0) {
        setFormData((prev) => ({ ...prev, Age: 0 }));
      }
    } else if (formData.Age !== 0) {
      setFormData((prev) => ({ ...prev, Age: 0 }));
    }
  }, [formData.DOB_Date, formData.DOB_Month, formData.DOB_Year, currentEthiopianYear, formData.Age]);

  // Age-based grade suggestion for Attendance Facilitators (only for allowed grades)
  useEffect(() => {
    if (student || formData.Age <= 0) return; // Don't auto-suggest for editing or invalid age

    // Only suggest grades for Attendance Facilitators
    if (userRole !== "Attendance Facilitator") return;

    // Don't override if user has manually selected a grade
    if (formData.Grade) return;

    let suggestedGradeIndex = -1;
    
    // Map age to grade (only suggest allowed grades)
    if (formData.Age < 7) {
      suggestedGradeIndex = 0; // Grade 1
    } else if (formData.Age >= 7 && formData.Age <= 8) {
      suggestedGradeIndex = 1; // Grade 2
    } else if (formData.Age >= 9 && formData.Age <= 10) {
      suggestedGradeIndex = 2; // Grade 3
    } else if (formData.Age >= 11 && formData.Age <= 12) {
      suggestedGradeIndex = 4; // Grade 5 (skip 4)
    } else if (formData.Age >= 13 && formData.Age <= 14) {
      suggestedGradeIndex = 6; // Grade 7 (skip 6)
    } else if (formData.Age >= 15 && formData.Age <= 16) {
      suggestedGradeIndex = 8; // Grade 9 (skip 8)
    } else if (formData.Age >= 17 && formData.Age <= 18) {
      suggestedGradeIndex = 10; // Grade 11 (skip 12)
    } else if (formData.Age >= 19) {
      suggestedGradeIndex = 13; // Grade 14
    }

    if (suggestedGradeIndex >= 0 && suggestedGradeIndex < GRADES.length) {
      const suggestedGrade = GRADES[suggestedGradeIndex];
      // Double-check that suggested grade is not restricted
      const gradeNumber = parseInt(suggestedGrade.match(/\d+/)?.[0] || '0');
      if (!restrictedGradesForFacilitator.includes(gradeNumber)) {
        setFormData((prev) => ({ ...prev, Grade: suggestedGrade }));
      }
    }
  }, [formData.Age, userRole, student]);

  // Unique ID generation for both Admin and Attendance Facilitator
  useEffect(() => {
    if (student) return; // Don't generate ID for existing students
    
    if (formData.Grade && formData.Academic_Year && /^\d{4}$/.test(formData.Academic_Year)) {
      setIsLoadingUniqueID(true);
      
      const year = formData.Academic_Year.slice(-2);
      const gradeNumMap: Record<typeof GRADES[number], string> = {
        [GRADES[0]]: "01", [GRADES[1]]: "01", [GRADES[2]]: "02", [GRADES[3]]: "03",
        [GRADES[4]]: "04", [GRADES[5]]: "05", [GRADES[6]]: "06", [GRADES[7]]: "07",
        [GRADES[8]]: "07", [GRADES[9]]: "08", [GRADES[10]]: "09", [GRADES[11]]: "10",
        [GRADES[12]]: "11", [GRADES[13]]: "12", [GRADES[14]]: "13"
      };
      const gradeNum = gradeNumMap[formData.Grade] || "01";
      
      // Validate grade before generating ID
      const gradeError = validateGradeByRole(formData.Grade, userRole);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setIsLoadingUniqueID(false);
        return;
      }

      // Generate ID based on role
      const generateID = async () => {
        try {
          let newUniqueID = "";
          
          if (userRole === "Admin") {
            // Admin uses count-based sequential ID
            const res = await fetch("/api/students/count", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                academicYear: formData.Academic_Year,
                grade: formData.Grade,
              }),
            });
            
            if (!res.ok) throw new Error(`Failed to get count: ${res.status}`);
            const data = await res.json();
            const newCount = data.count + 1;
            newUniqueID = `ብሕ/${year}/${gradeNum}/${String(newCount).padStart(3, "0")}`;
          } else if (userRole === "Attendance Facilitator") {
            // Facilitator uses role-based sequential ID
            const res = await fetch("/api/students/facilitator-count", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                academicYear: formData.Academic_Year,
                grade: formData.Grade,
              }),
            });
            
            if (!res.ok) {
              // Fallback to simple timestamp-based ID if API fails
              const timestamp = Date.now().toString().slice(-6);
              newUniqueID = `ፋሲ/${year}/${gradeNum}/${timestamp}`;
            } else {
              const data = await res.json();
              const newCount = data.count + 1;
              newUniqueID = `ፋሲ/${year}/${gradeNum}/${String(newCount).padStart(3, "0")}`;
            }
          }
          
          setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
          setErrors((prev) => ({ ...prev, Unique_ID: "" }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Failed to generate ID";
          setFormData((prev) => ({ ...prev, Unique_ID: "" }));
          setErrors((prev) => ({
            ...prev,
            Unique_ID: `Error generating ID: ${errorMsg}`,
          }));
        } finally {
          setIsLoadingUniqueID(false);
        }
      };

      generateID();
    }
  }, [student, formData.Academic_Year, formData.Grade, userRole]);

  const checkDuplicate = async () => {
    if (student) return false;
    
    try {
      const res = await fetch("/api/students/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          First_Name: formData.First_Name,
          Father_Name: formData.Father_Name,
          Grandfather_Name: formData.Grandfather_Name,
          Mothers_Name: formData.Mothers_Name,
          Sex: formData.Sex,
        }),
      });
      if (!res.ok) throw new Error("Failed to check duplicate");
      const { exists } = await res.json();
      return exists;
    } catch {
      return false;
    }
  };

  const validateSection = (data: Omit<Student, "_id">, fields: (keyof Omit<Student, "_id">)[]): Partial<Record<keyof Omit<Student, "_id">, string>> => {
    const errors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
    fields.forEach((field) => {
      if (!data[field]) {
        errors[field] = `${field.replace("_", " ")} is required`;
      }
    });
    
    if (data.DOB_Date && data.DOB_Month && data.DOB_Year) {
      const year = parseInt(data.DOB_Year);
      const month = parseInt(data.DOB_Month);
      const date = parseInt(data.DOB_Date);
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

    // Validate grade based on role for new students
    if (!student && data.Grade) {
      const gradeError = validateGradeByRole(data.Grade, userRole, false);
      if (gradeError) {
        errors.Grade = gradeError;
      }
    }

    setErrors((prev) => ({ ...prev, ...errors }));
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate grade based on role for new students
    if (!student && formData.Grade) {
      const gradeError = validateGradeByRole(formData.Grade, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        setLoading(false);
        return;
      }
    }

    // Validate all form fields
    const newErrors = validateStudentForm(formData, !student);
    setErrors((prev) => ({ ...prev, ...newErrors }));
    
    if (Object.keys(newErrors).length > 0) {
      setError("Please fix form errors");
      setLoading(false);
      return;
    }

    // Check for duplicates only for new students
    if (!student) {
      const isDuplicate = await checkDuplicate();
      if (isDuplicate) {
        setError("Student with this name already exists. Please check the details.");
        setLoading(false);
        return;
      }
    }

    try {
      const dataToSubmit: Omit<Student, "_id"> = {
        ...formData,
        School: formData.School === "Other" ? formData.School_Other || "" : formData.School || "",
        Address: formData.Address === "Other" ? formData.Address_Other || "" : formData.Address || "",
        Academic_Year: String(formData.Academic_Year),
      };
      
      // Final grade validation before submission
      if (!student && dataToSubmit.Grade) {
        const finalGradeError = validateGradeByRole(dataToSubmit.Grade, userRole, false);
        if (finalGradeError) {
          setError(finalGradeError);
          setLoading(false);
          return;
        }
      }
      
      await onSave(dataToSubmit);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save student data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numberFields: (keyof Omit<Student, "_id">)[] = [
      "DOB_Date",
      "DOB_Month",
      "DOB_Year",
      "Phone_Number",
    ];

    // Real-time grade validation for new students
    if (name === "Grade" && !student && value) {
      const gradeError = validateGradeByRole(value, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        // Don't update form data for invalid grades
        return;
      } else {
        // Clear error if valid selection
        setErrors((prev) => ({ ...prev, Grade: "" }));
        if (error && error.includes("Grade")) {
          setError(null);
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name as keyof Omit<Student, "_id">)
        ? value.replace(/[^\d]/g, "")
        : name === "Age"
        ? parseInt(value) || 0
        : value,
    }));
    
    // Clear field-specific errors on change (except for grade validation)
    if (name !== "Grade" && errors[name as keyof Omit<Student, "_id">]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return {
    formData,
    setFormData,
    error,
    loading,
    isLoadingUniqueID,
    errors,
    academicYears,
    handleChange,
    handleSubmit,
    validateSection,
  };
}