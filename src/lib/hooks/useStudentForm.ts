// src/lib/hooks/useStudentForm.ts
import { useState, useEffect } from "react";
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
  const [errors, setErrors] = useState<
    Partial<Record<keyof Omit<Student, "_id">, string>>
  >({});
  const academicYears = [currentEthiopianYear];

  // Restricted grades for Attendance Facilitators
  const restrictedGradesForFacilitator = [4, 6, 8, 12];

  // Validate grade based on user role for new student registration
  const validateGradeByRole = (
    grade: string,
    role: UserRole,
    isEditing: boolean = false
  ): string | null => {
    if (!grade || isEditing) return null;

    const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || "0");

    if (role === "Attendance Facilitator") {
      if (restrictedGradesForFacilitator.includes(gradeNumber)) {
        return `Attendance Facilitators cannot register students for Grade ${gradeNumber}. Please contact an administrator.`;
      }
    }

    return null; // Admin can register all grades
  };

  // Initialize form data if editing
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

  // DOB → Age calculation
  useEffect(() => {
    if (formData.DOB_Date && formData.DOB_Month && formData.DOB_Year) {
      const date = parseInt(formData.DOB_Date);
      const month = parseInt(formData.DOB_Month);
      const year = parseInt(formData.DOB_Year);

      const isPagume = month === 13;
      const maxDay = isEthiopianLeapYear(year)
        ? isPagume
          ? 6
          : 30
        : isPagume
        ? 5
        : 30;
      const dobErrors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
      if (month < 1 || month > 13) dobErrors.DOB_Month = "Invalid month";
      if (date < 1 || date > maxDay)
        dobErrors.DOB_Date = `Invalid date for ${
          isPagume ? "Pagumē" : "month"
        }`;
      if (year < 1900 || year > currentEthiopianYear)
        dobErrors.DOB_Year = "Invalid year";

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
  }, [
    formData.DOB_Date,
    formData.DOB_Month,
    formData.DOB_Year,
    currentEthiopianYear,
    formData.Age,
  ]);

  // Age → Grade suggestion
  useEffect(() => {
    if (student || formData.Age <= 0) return;
    if (formData.Grade) return; // Don’t override manual selection

    let grade: string;

    if (formData.Age < 7) grade = GRADES[0]; // ቅድመ መደበኛ
    else if (formData.Age <= 8) grade = GRADES[1];
    else if (formData.Age <= 10) grade = GRADES[2];
    else if (formData.Age <= 12) grade = GRADES[3];
    else if (formData.Age <= 14) grade = GRADES[4];
    else if (formData.Age <= 16) grade = GRADES[5];
    else if (formData.Age <= 18) grade = GRADES[6];
    else if (formData.Age <= 25) grade = GRADES[7];
    else grade = GRADES[8];

    // If facilitator, make sure grade is not restricted
    if (userRole === "Attendance Facilitator") {
      const gradeNumber = parseInt(grade.match(/\d+/)?.[0] || "0");
      if (restrictedGradesForFacilitator.includes(gradeNumber)) return;
    }

    setFormData((prev) => ({ ...prev, Grade: grade }));
  }, [formData.Age, userRole, student]);

  // Unique ID generation
  useEffect(() => {
    if (student) return;

    if (
      formData.Grade &&
      formData.Academic_Year &&
      /^\d{4}$/.test(formData.Academic_Year)
    ) {
      setIsLoadingUniqueID(true);

      const year = formData.Academic_Year.slice(-2);
      const gradeNumMap: Record<(typeof GRADES)[number], string> = {
        [GRADES[0]]: "01",
        [GRADES[1]]: "01",
        [GRADES[2]]: "02",
        [GRADES[3]]: "03",
        [GRADES[4]]: "04",
        [GRADES[5]]: "05",
        [GRADES[6]]: "06",
        [GRADES[7]]: "07",
        [GRADES[8]]: "07",
        [GRADES[9]]: "08",
        [GRADES[10]]: "09",
        [GRADES[11]]: "10",
        [GRADES[12]]: "11",
        [GRADES[13]]: "12",
        [GRADES[14]]: "13",
      };
      const gradeNum = gradeNumMap[formData.Grade] || "01";

      const gradeError = validateGradeByRole(formData.Grade, userRole);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setIsLoadingUniqueID(false);
        return;
      }

      const generateID = async () => {
        try {
          let newUniqueID = "";
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
          newUniqueID = `ብሕ/${year}/${gradeNum}/${String(newCount).padStart(
            3,
            "0"
          )}`;

          setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
          setErrors((prev) => ({ ...prev, Unique_ID: "" }));
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Failed to generate ID";
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

  // Duplicate check
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

  // Validation helper
  const validateSection = (
    data: Omit<Student, "_id">,
    fields: (keyof Omit<Student, "_id">)[]
  ): Partial<Record<keyof Omit<Student, "_id">, string>> => {
    const errors: Partial<Record<keyof Omit<Student, "_id">, string>> = {};
    fields.forEach((field) => {
      if (!data[field])
        errors[field] = `${field.replace("_", " ")} is required`;
    });

    if (data.DOB_Date && data.DOB_Month && data.DOB_Year) {
      const year = parseInt(data.DOB_Year);
      const month = parseInt(data.DOB_Month);
      const date = parseInt(data.DOB_Date);
      const isPagume = month === 13;
      const maxDay = isEthiopianLeapYear(year)
        ? isPagume
          ? 6
          : 30
        : isPagume
        ? 5
        : 30;
      if (month < 1 || month > 13) errors.DOB_Month = "Invalid month";
      if (date < 1 || date > maxDay)
        errors.DOB_Date = `Invalid date for ${isPagume ? "Pagumē" : "month"}`;
      if (year < 1900 || year > getCurrentEthiopianYear())
        errors.DOB_Year = "Invalid year";
    }

    if (!student && data.Grade) {
      const gradeError = validateGradeByRole(data.Grade, userRole, false);
      if (gradeError) errors.Grade = gradeError;
    }

    setErrors((prev) => ({ ...prev, ...errors }));
    return errors;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!student && formData.Grade) {
      const gradeError = validateGradeByRole(formData.Grade, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        setLoading(false);
        return;
      }
    }

    const newErrors = validateStudentForm(formData, !student);
    setErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      setError("Please fix form errors");
      setLoading(false);
      return;
    }

    if (!student) {
      const isDuplicate = await checkDuplicate();
      if (isDuplicate) {
        setError("Student with this name already exists.");
        setLoading(false);
        return;
      }
    }

    try {
      const dataToSubmit: Omit<Student, "_id"> = {
        ...formData,
        School:
          formData.School === "Other"
            ? formData.School_Other || ""
            : formData.School || "",
        Address:
          formData.Address === "Other"
            ? formData.Address_Other || ""
            : formData.Address || "",
        Academic_Year: String(formData.Academic_Year),
      };

      if (!student && dataToSubmit.Grade) {
        const finalGradeError = validateGradeByRole(
          dataToSubmit.Grade,
          userRole,
          false
        );
        if (finalGradeError) {
          setError(finalGradeError);
          setLoading(false);
          return;
        }
      }

      await onSave(dataToSubmit);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save student data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    const numberFields: (keyof Omit<Student, "_id">)[] = [
      "DOB_Date",
      "DOB_Month",
      "DOB_Year",
      "Phone_Number",
    ];

    const textFields: (keyof Omit<Student, "_id">)[] = [
      "First_Name",
      "Father_Name",
      "Grandfather_Name",
      "Mothers_Name",
      "Christian_Name",
      "Place_of_Work",
      "School_Other",
      "Address_Other",
    ];

    let newValue = value;

    if (numberFields.includes(name as keyof Omit<Student, "_id">)) {
      // Keep only digits
      newValue = value.replace(/[^\d]/g, "");
    }

    if (textFields.includes(name as keyof Omit<Student, "_id">)) {
      // Keep only letters and spaces
      newValue = value.replace(/[^a-zA-Z\s]/g, "");
    }

    if (name === "Grade" && !student && value) {
      const gradeError = validateGradeByRole(value, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        return;
      } else {
        setErrors((prev) => ({ ...prev, Grade: "" }));
        if (error && error.includes("Grade")) setError(null);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "Age" ? parseInt(newValue) || 0 : newValue,
    }));

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
