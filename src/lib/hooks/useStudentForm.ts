// src/lib/hooks/useStudentForm.ts
import { useState, useEffect, useMemo } from "react";
import { Student } from "@/lib/models";
import { calculateAge, validateStudentForm } from "@/lib/formUtils";
import { getTodayEthiopianDateISO } from "@/lib/utils";

export function useStudentForm(student: Student | null, onSave: (studentData: Omit<Student, "_id">) => Promise<void>) {
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
    Academic_Year: "",
    Grade: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingUniqueID, setIsLoadingUniqueID] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Student, "_id">, string>>>({});

  const academicYears = useMemo(() => {
    const dateStr = getTodayEthiopianDateISO(); // e.g., "2018-01-01"
    const year = parseInt(dateStr.split("-")[0], 10); // Extract year
    return Array.from({ length: 6 }, (_, i) => year - 2 + i);
  }, []);

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
        Academic_Year: student.Academic_Year || "",
        Grade: student.Grade || "",
      });
    } else if (academicYears.length > 0) {
      setFormData((prev) => ({
        ...prev,
        Academic_Year: academicYears[2].toString(),
      }));
    }
  }, [student, academicYears]);

  useEffect(() => {
    if (formData.DOB_Date && formData.DOB_Month && formData.DOB_Year) {
      const age = calculateAge(
        parseInt(formData.DOB_Date),
        parseInt(formData.DOB_Month),
        parseInt(formData.DOB_Year)
      );
      if (age >= 0) {
        setFormData((prev) => ({ ...prev, Age: age }));
      }
    }
  }, [formData.DOB_Date, formData.DOB_Month, formData.DOB_Year]);

  useEffect(() => {
    if (!student && formData.Grade && formData.Academic_Year && /^\d{4}$/.test(formData.Academic_Year)) {
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
          const gradeNum = formData.Grade.match(/\d+/)?.[0]?.padStart(2, "0") || "01";
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
  }, [student, formData.Academic_Year, formData.Grade]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      "Academic_Year",
    ];
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
  };
}