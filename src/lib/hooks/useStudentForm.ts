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

  // Grade assignment based on Age
  useEffect(() => {
    if (userRole !== "Admin" || formData.Age <= 0) {
      if (formData.Grade !== "") {
        setFormData((prev) => ({ ...prev, Grade: "" }));
      }
      return;
    }

    let grade: string;
    if (formData.Age < 7) {
      grade = GRADES[0]; // ቅድመ መደበኛ
    } else if (formData.Age === 7 || formData.Age === 8) {
      grade = GRADES[1]; // አንደኛ ክፍል
    } else if (formData.Age === 9 || formData.Age === 11) {
      grade = GRADES[2]; // ሁለተኛ ክፍል
    } else if (formData.Age === 12 || formData.Age === 13) {
      grade = GRADES[3]; // ሦስተኛ ክፍል
    } else if (formData.Age === 14 || formData.Age === 15 || formData.Age === 16) {
      grade = GRADES[5]; // አምስተኛ ክፍል
    } else if (formData.Age >= 17 && formData.Age <= 20) {
      grade = formData.Grade === GRADES[7] || formData.Grade === GRADES[8] ? formData.Grade : GRADES[7]; // Default to ሰባተኛ ክፍል ጥዋት
    } else {
      grade = GRADES[8]; // ሰባተኛ ክፍል ከሰዓት for age >= 20
    }
    if (grade !== formData.Grade) {
      setFormData((prev) => ({ ...prev, Grade: grade }));
    }
  }, [formData.Age, formData.Grade, userRole]);

  useEffect(() => {
    if (!student && formData.Grade && formData.Academic_Year && /^\d{4}$/.test(formData.Academic_Year) && userRole === "Admin") {
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
    }
  }, [student, formData.Academic_Year, formData.Grade, userRole]);

  const checkDuplicate = async () => {
    if (student || userRole !== "Admin") return false;
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
    setErrors((prev) => ({ ...prev, ...errors }));
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "Admin") {
      setError("Only Admins can submit student data");
      return;
    }
    setLoading(true);
    setError(null);

    const newErrors = validateStudentForm(formData, !student);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError("Please fix form errors");
      setLoading(false);
      return;
    }

    if (!student) {
      const isDuplicate = await checkDuplicate();
      if (isDuplicate) {
        setError("Student already exists.");
        setLoading(false);
        return;
      }
    }

    try {
      const dataToSubmit: Omit<Student, "_id"> = {
        ...formData,
        School: formData.School === "Other" ? formData.School_Other || "" : formData.School || "",
        Address: formData.Address === "Other" ? formData.Address_Other || "" : formData.Address || "",
      };
      await onSave(dataToSubmit);
    } catch (err) {
      setError((err as Error).message);
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
    if (name === "Grade" && userRole !== "Admin") {
      setError("Only Admins can edit Grade");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name as keyof Omit<Student, "_id">)
        ? value.replace(/[^\d]/g, "")
        : name === "Age"
        ? parseInt(value) || 0
        : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
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