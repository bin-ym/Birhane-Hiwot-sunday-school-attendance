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

  // Validate grade based on user role for new student registration
  const validateGradeByRole = (grade: string, role: UserRole): string | null => {
    if (!grade) return null;

    const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || '0');
    const allowedAdminGrades = [4, 6, 9, 10, 11, 12]; // Grade 4, 6, and >8 (9-12)
    
    // For Admin role - restrict to specific grades when creating new students
    if (role === "Admin" && !student) {
      if (!allowedAdminGrades.includes(gradeNumber)) {
        return `Admin can only register students for Grade 4, Grade 6, and grades above 8 (9-12).`;
      }
    }
    
    // For Attendance Facilitator - allow all grades
    if (role === "Attendance Facilitator") {
      return null; // No restrictions
    }
    
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

  // Updated Grade assignment based on Age - only for Attendance Facilitator role
  useEffect(() => {
    // Only auto-assign grades for Attendance Facilitator role when creating new students
    if (userRole !== "Attendance Facilitator" || formData.Age <= 0 || student) {
      return;
    }

    let grade: string;
    if (formData.Grade) {
      // If grade is already selected, don't override it
      return;
    }

    if (formData.Age < 7) {
      grade = GRADES[0]; // ቅድመ መደበኛ
    } else if (formData.Age === 7 || formData.Age === 8) {
      grade = GRADES[1]; // አንደኛ ክፍል
    } else if (formData.Age === 9 || formData.Age === 10) {
      grade = GRADES[2]; // ሁለተኛ ክፍል
    } else if (formData.Age === 11 || formData.Age === 12) {
      grade = GRADES[3]; // ሦስተኛ ክፍል
    } else if (formData.Age === 13 || formData.Age === 14) {
      grade = GRADES[4]; // አራተኛ ክፍል
    } else if (formData.Age === 15 || formData.Age === 16) {
      grade = GRADES[5]; // አምስተኛ ክፍል
    } else if (formData.Age === 17 || formData.Age === 18) {
      grade = GRADES[6]; // ስድስተኛ ክፍል
    } else if (formData.Age >= 19 && formData.Age <= 25) {
      grade = GRADES[7]; // ሰባተኛ ክፍል ጥዋት (default for older students)
    } else {
      grade = GRADES[8]; // ሰባተኛ ክፍል ከሰዓት for very old students
    }
    
    setFormData((prev) => ({ ...prev, Grade: grade }));
  }, [formData.Age, userRole, student]);

  // Updated Unique ID generation - allow for both Admin and Attendance Facilitator
  useEffect(() => {
    // Generate Unique ID for new students (both Admin and Attendance Facilitator)
    if (!student && formData.Grade && formData.Academic_Year && /^\d{4}$/.test(formData.Academic_Year)) {
      // Only Admins generate IDs through the count API, Attendance Facilitators use a simpler approach
      if (userRole === "Admin") {
        setIsLoadingUniqueID(true);
        fetch("/api/students/count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYear: formData.Academic_Year,
            grade: formData.Grade,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
            return res.json();
          })
          .then((data) => {
            const newCount = data.count + 1;
            const year = formData.Academic_Year.slice(-2);
            const gradeNumMap: Record<typeof GRADES[number], string> = {
              [GRADES[0]]: "01", // ቅድመ መደበኛ
              [GRADES[1]]: "01", // አንደኛ ክፍል
              [GRADES[2]]: "02", // ሁለተኛ ክፍል
              [GRADES[3]]: "03", // ሦስተኛ ክፍል
              [GRADES[4]]: "04", // አራተኛ ክፍል
              [GRADES[5]]: "05", // አምስተኛ ክፍል
              [GRADES[6]]: "06", // ስድስተኛ ክፍል
              [GRADES[7]]: "07", // ሰባተኛ ክፍል ጥዋት
              [GRADES[8]]: "07", // ሰባተኛ ክፍል ከሰዓት
              [GRADES[9]]: "08", // ስምንተኛ ክፍል
              [GRADES[10]]: "09", // ዘጠኝ ክፍል
              [GRADES[11]]: "10", // አስረኛ ክፍል
              [GRADES[12]]: "11", // አስራኛ ክፍል
              [GRADES[13]]: "12", // አስራ አንደኛ ክፍል
              [GRADES[14]]: "13", // አስራ ሁለተኛ ክፍል
            };
            const gradeNum = gradeNumMap[formData.Grade] || "01";
            const newUniqueID = `ብሕ/${year}/${gradeNum}/${String(newCount).padStart(2, "0")}`;
            setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
          })
          .catch((error) => {
            setFormData((prev) => ({ ...prev, Unique_ID: "" }));
            setErrors((prev) => ({
              ...prev,
              Unique_ID: `Error generating ID: ${error.message}`,
            }));
          })
          .finally(() => {
            setIsLoadingUniqueID(false);
          });
      } else if (userRole === "Attendance Facilitator") {
        // For Attendance Facilitator, generate a simpler sequential ID
        setIsLoadingUniqueID(true);
        const year = formData.Academic_Year.slice(-2);
        const gradeNumMap: Record<typeof GRADES[number], string> = {
          [GRADES[0]]: "01", [GRADES[1]]: "01", [GRADES[2]]: "02", [GRADES[3]]: "03",
          [GRADES[4]]: "04", [GRADES[5]]: "05", [GRADES[6]]: "06", [GRADES[7]]: "07",
          [GRADES[8]]: "07", [GRADES[9]]: "08", [GRADES[10]]: "09", [GRADES[11]]: "10",
          [GRADES[12]]: "11", [GRADES[13]]: "12", [GRADES[14]]: "13"
        };
        const gradeNum = gradeNumMap[formData.Grade] || "01";
        // Simple sequential ID for facilitators (you might want to implement a counter API)
        const facilitatorCount = Math.floor(Math.random() * 99) + 1; // Temporary random number
        const newUniqueID = `ፋሲ/${year}/${gradeNum}/${String(facilitatorCount).padStart(2, "0")}`;
        
        setTimeout(() => {
          setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
          setIsLoadingUniqueID(false);
        }, 1000);
      }
    }
  }, [student, formData.Academic_Year, formData.Grade, userRole]);

  const checkDuplicate = async () => {
    if (student) return false; // Don't check duplicates when editing existing students
    
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
      const gradeError = validateGradeByRole(data.Grade, userRole);
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
      const gradeError = validateGradeByRole(formData.Grade, userRole);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        setLoading(false);
        return;
      }
    }

    // Validate all form fields
    const newErrors = validateStudentForm(formData, !student);
    
    // Merge with existing errors
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
        // Ensure Academic_Year is a string
        Academic_Year: String(formData.Academic_Year),
      };
      
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

    // Validate grade selection based on role for new students
    if (name === "Grade" && !student) {
      const gradeError = validateGradeByRole(value, userRole);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        return; // Don't update the form data if grade is invalid
      } else {
        // Clear error if valid
        setErrors((prev) => ({ ...prev, Grade: "" }));
        setError(null);
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
    
    // Clear field-specific errors on change
    if (errors[name as keyof Omit<Student, "_id">]) {
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