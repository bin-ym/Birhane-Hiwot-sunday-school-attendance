// src/lib/hooks/useStudentForm.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Student, UserRole, StudentClassification } from "@/lib/models";
import { calculateAge, validateStudentForm } from "@/lib/formUtils";
import {
  getCurrentEthiopianYear,
  isEthiopianLeapYear,
  mapAgeToGrade,
  getGradeNumber,
} from "@/lib/utils";

export function useStudentForm(
  student: Student | null,
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>,
  userRole: UserRole,
  initialClassification: StudentClassification = "Regular",
) {
  const currentEthiopianYear = getCurrentEthiopianYear();

  const [formData, setFormData] = useState<Omit<Student, "_id">>({
    Unique_ID: "",
    First_Name: "",
    Father_Name: "",
    Grandfather_Name: "",
    Mothers_Name: "",
    Christian_Name: "",
    photo_data_url: "",
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
    Grade: student?.Grade || "",
    Classification:
      (student?.Classification as StudentClassification) ||
      initialClassification ||
      "Regular",
    classSessionId: student?.classSessionId ? String(student.classSessionId) : "",
    classSessionName: student?.classSessionName || "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingUniqueID, setIsLoadingUniqueID] = useState(false);
  const [isRequestingAdmin, setIsRequestingAdmin] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof Omit<Student, "_id">, string>>
  >({});

  // NEW STATE: Tracks if the latest AGE-based suggestion was restricted
  const [isLatestAgeSuggestionRestricted, setIsLatestAgeSuggestionRestricted] =
    useState(false);

  const academicYears = useMemo(
    () => [currentEthiopianYear],
    [currentEthiopianYear],
  );

  // Grades restricted for facilitators
  const restrictedGradesForFacilitator = useMemo(() => [4, 6, 8, 12], []);

  // Helper: check if a grade name is in the restricted set (grades 4, 6, 8, 12)
  const isGradeRestricted = useCallback(
    (gradeName: string): boolean => {
      const num = getGradeNumber(gradeName);
      return restrictedGradesForFacilitator.includes(num);
    },
    [restrictedGradesForFacilitator],
  );

  // Helper to validate grade by role — only blocks restricted grades for Attendance Facilitators
  const validateGradeByRole = useCallback(
    (grade: string, role: UserRole, isEditing = false): string | null => {
      if (!grade || isEditing) return null;

      if (role === "Attendance Facilitator" && isGradeRestricted(grade)) {
        return `Grade ${getGradeNumber(grade)} is restricted for Attendance Facilitators. Please use "Request Admin Approval" instead.`;
      }
      return null;
    },
    [isGradeRestricted],
  );

  // Initialize form data if editing or classification changes
  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        Academic_Year: String(currentEthiopianYear),
      });
      setIsLatestAgeSuggestionRestricted(false);
    } else if (initialClassification) {
      setFormData((prev) => ({
        ...prev,
        Classification: initialClassification,
      }));
    }
  }, [student, currentEthiopianYear, initialClassification]);

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

      setErrors((prev) => ({ ...prev, ...dobErrors }));

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
    formData.Age,
    currentEthiopianYear,
  ]);

  // Age → Grade suggestion (FIXED)
  useEffect(() => {
    // Only run for new students and if age is valid
    if (student || formData.Age <= 0) {
      setIsLatestAgeSuggestionRestricted(false);
      return;
    }

    // Only suggest grades based on age for Regular classification
    // Extension, SignLanguage, and Summer have their own fixed grade options
    const currentClassification =
      formData.Classification || initialClassification || "Regular";
    if (currentClassification !== "Regular") {
      setIsLatestAgeSuggestionRestricted(false);
      return;
    }

    const suggestedGrade = mapAgeToGrade(formData.Age);
    // Extract grade number from string like "ሦስተኛ ክፍል" or "Grade 4"
    const gradeNumber = parseInt(suggestedGrade?.match(/\d+/)?.[0] || "0");
    const isRestricted = userRole === "Attendance Facilitator";

    console.log("🔍 Grade Suggestion Debug:", {
      age: formData.Age,
      suggestedGrade,
      gradeNumber,
      userRole,
      isRestricted,
      currentGrade: formData.Grade,
    });

    // Check if the suggested grade itself is restricted
    const isSuggestionRestricted =
      isRestricted && isGradeRestricted(suggestedGrade);

    // Update the restriction flag
    setIsLatestAgeSuggestionRestricted(isSuggestionRestricted);

    // If grade matches suggestion, don't update
    if (formData.Grade === suggestedGrade) {
      return;
    }

    if (isSuggestionRestricted) {
      // Clear grade and show error for restricted grades only
      setFormData((prev) => ({ ...prev, Grade: "" }));
      setErrors((prev) => ({
        ...prev,
        Grade: `Grade ${getGradeNumber(suggestedGrade)} is restricted for Attendance Facilitators. Please use "Request Admin Approval" instead.`,
      }));
      toast.error(
        `⚠️ Grade ${getGradeNumber(suggestedGrade)} is restricted for Attendance Facilitators.`,
        { duration: 5000 },
      );
    } else {
      // Set suggested grade (only blocked if restricted)
      setFormData((prev) => ({ ...prev, Grade: suggestedGrade }));
      setErrors((prev) => ({ ...prev, Grade: "" }));
      if (suggestedGrade) {
        toast.success(
          `✅ Grade suggested: ${suggestedGrade} (Age: ${formData.Age})`,
          { duration: 3000 },
        );
      }
    }
  }, [
    formData.Age,
    formData.Grade,
    formData.Classification,
    initialClassification,
    userRole,
    student,
    restrictedGradesForFacilitator,
    isGradeRestricted,
  ]);

  // Classification prefix mapping
  const CLASSIFICATION_PREFIXES: Record<string, string> = useMemo(
    () => ({
      Regular: "",
      Extension: "ር/",
      SignLanguage: "ም/",
      Summer: "ክ/",
      begena: "በ/",
    }),
    [],
  );

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
      // Numeric grade (0-12); both grade-7 streams resolve to 7 via getGradeNumber.
      const gradeNum = String(getGradeNumber(formData.Grade)).padStart(2, "0");

      const gradeError = validateGradeByRole(formData.Grade, userRole);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setIsLoadingUniqueID(false);
        return;
      }

      const generateID = async () => {
        try {
          const res = await fetch("/api/students/count", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              academicYear: formData.Academic_Year,
              grade: formData.Grade,
              classification: formData.Classification || "Regular",
            }),
          });
          if (!res.ok) throw new Error(`Failed to get count: ${res.status}`);
          const data = await res.json();
          const newCount = data.count + 1;

          // New Ethiopian calendar-based ID format:
          // Format: ብሕ/[Prefix]/{Year}/{GradeNum-Stream}/{Count}
          // e.g. ብሕ/18/07-1/004 for Regular, ብሕ/ር/18/07-1/004 for Extension, ብሕ/ም/18/07-1/004 for SignLanguage, ብሕ/ክ/18/07-1/004 for Summer
          let gradeStream = gradeNum;
          if (formData.Grade === "ሰባተኛ ክፍል ጥዋት") {
            gradeStream = `${gradeNum}-1`;
          } else if (formData.Grade === "ሰባተኛ ክፍል ከሰዓት") {
            gradeStream = `${gradeNum}-2`;
          } else if (formData.Grade === "1ኛ ዓመት") {
            gradeStream = "01";
          } else if (formData.Grade === "2ኛ ዓመት") {
            gradeStream = "02";
          } else if (formData.Grade === "ምልክት ቋንቋ") {
            gradeStream = "01";
          } else if (formData.Grade === "በገና") {
            gradeStream = "01";
          }

          const classPrefix =
            CLASSIFICATION_PREFIXES[formData.Classification || "Regular"] || "";

          const newUniqueID = `ብሕ/${classPrefix}${year}/${gradeStream}/${String(
            newCount,
          ).padStart(3, "0")}`;

          setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
          setErrors((prev) => ({ ...prev, Unique_ID: "" }));
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Failed to generate ID";
          setFormData((prev) => ({ ...prev, Unique_ID: "" }));
          setErrors((prev) => ({
            ...prev,
            Unique_ID: `Error generating ID: ${msg}`,
          }));
        } finally {
          setIsLoadingUniqueID(false);
        }
      };

      generateID();
    } else if (!formData.Grade) {
      setFormData((prev) => ({ ...prev, Unique_ID: "" }));
      setIsLoadingUniqueID(false);
    }
  }, [
    student,
    formData.Academic_Year,
    formData.Grade,
    formData.Classification,
    userRole,
    validateGradeByRole,
    CLASSIFICATION_PREFIXES,
  ]);

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
  const validateSection = useCallback(
    (data: Omit<Student, "_id">, fields: (keyof Omit<Student, "_id">)[]) => {
      const sectionErrors: Partial<Record<keyof Omit<Student, "_id">, string>> =
        {};
      fields.forEach((field) => {
        if (!data[field])
          sectionErrors[field] = `${field.replace(/_/g, " ")} is required`;
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

        if (month < 1 || month > 13) sectionErrors.DOB_Month = "Invalid month";
        if (date < 1 || date > maxDay)
          sectionErrors.DOB_Date = `Invalid date for ${
            isPagume ? "Pagumē" : "month"
          }`;
        if (year < 1900 || year > getCurrentEthiopianYear())
          sectionErrors.DOB_Year = "Invalid year";
      }

      if (!student && data.Grade) {
        const gradeError = validateGradeByRole(data.Grade, userRole, false);
        if (gradeError) sectionErrors.Grade = gradeError;
      }

      setErrors((prev) => ({ ...prev, ...sectionErrors }));
      return sectionErrors;
    },
    [student, userRole, validateGradeByRole],
  );

  // Handle admin request
  const handleRequestAdmin = async (requestData: Omit<Student, "_id">) => {
    setIsRequestingAdmin(true);
    try {
      const response = await fetch("/api/student-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentData: requestData,
          requestedBy: userRole,
          requestedByName: requestData.First_Name,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit request");
      }

      toast.success("✅ Admin approval request submitted successfully!", {
        duration: 5000,
      });
      setError(null);

      // Reset form
      setFormData({
        Unique_ID: "",
        First_Name: "",
        Father_Name: "",
        Grandfather_Name: "",
        Mothers_Name: "",
        Christian_Name: "",
        photo_data_url: "",
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
        Classification: initialClassification || "Regular",
      });
      setIsLatestAgeSuggestionRestricted(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit request";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRequestingAdmin(false);
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check for restricted grade (grades 4, 6, 8, 12)
    if (
      !student &&
      userRole === "Attendance Facilitator" &&
      formData.Grade &&
      isGradeRestricted(formData.Grade)
    ) {
      const msg = `Grade ${getGradeNumber(formData.Grade)} is restricted for Attendance Facilitators. Please use "Request Admin Approval" instead.`;
      setError(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    // Validate grade
    if (!student && formData.Grade) {
      const gradeError = validateGradeByRole(formData.Grade, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
        toast.error(gradeError);
        setLoading(false);
        return;
      }
    }

    // General validation
    const newErrors = validateStudentForm(formData, !student);
    setErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      setError("Please fix form errors");
      toast.error("Please fix form errors");
      setLoading(false);
      return;
    }

    // Duplicate check
    if (!student) {
      const isDuplicate = await checkDuplicate();
      if (isDuplicate) {
        setError("Student with this name already exists.");
        toast.error("Student with this name already exists.");
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
            : formData.School,
        Address:
          formData.Address === "Other"
            ? formData.Address_Other || ""
            : formData.Address,
        Academic_Year: String(formData.Academic_Year),
      };

      await onSave(dataToSubmit);
      setError(null);
      toast.success(
        student ? "Student updated successfully" : "Student added successfully",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save student data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      newValue = value.replace(/[^\d]/g, "");
    }
    if (textFields.includes(name as keyof Omit<Student, "_id">)) {
      newValue = value.replace(/[^a-zA-Z\u1200-\u137F\s]/g, "");
    }

    // Special handling for Grade change — only block restricted grades
    if (name === "Grade") {
      setIsLatestAgeSuggestionRestricted(false);

      const gradeError = validateGradeByRole(value, userRole, false);
      if (gradeError) {
        setErrors((prev) => ({ ...prev, Grade: gradeError }));
        setError(gradeError);
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

  console.log("🎯 Hook State:", {
    age: formData.Age,
    grade: formData.Grade,
    isLatestAgeSuggestionRestricted,
    userRole,
  });

  return {
    formData,
    setFormData,
    error,
    loading,
    isLoadingUniqueID,
    isRequestingAdmin,
    errors,
    academicYears,
    handleChange,
    handleSubmit,
    validateSection,
    handleRequestAdmin,
    isLatestAgeSuggestionRestricted,
  };
}
