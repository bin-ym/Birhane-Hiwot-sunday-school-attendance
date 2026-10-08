"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  UserCheck,
  ShieldCheck,
  BookOpen,
  Sun,
  Music,
  PlusCircle,
  Eye,
} from "lucide-react";
import { StudentClassification, UserRole } from "@/lib/models";
import {
  getCurrentEthiopianYear,
  getAcademicYearLifecycle,
  isCategoryRegistrationOpen,
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AMHARIC,
} from "@/lib/utils";
import {
  CLASSIFICATION_PREFIXES,
  getGradeLabel,
  getGradeNumberByName,
  schools,
  addresses,
} from "@/lib/constants";

interface StudentRegistrationWizardProps {
  userRole: UserRole;
  onCancel?: () => void;
  baseStudentPath?: string;
}

interface ClassSessionItem {
  _id: string;
  name: string;
  nameAmharic: string;
  academicYear: string;
  classification: StudentClassification;
  dayOfWeek: "Saturday" | "Sunday";
  session: "Morning" | "Afternoon";
  startTime?: string;
  endTime?: string;
  grades: string[];
  isActive: boolean;
}

const CLASSIFICATION_ITEMS: {
  value: StudentClassification;
  titleAmharic: string;
  titleEnglish: string;
  tagline: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "Regular",
    titleAmharic: "መደበኛ",
    titleEnglish: "Regular Sunday School",
    tagline: "የእሁድ እሁድ ትምህርት",
    description: "ከቅድመ መደበኛ እስከ 12ኛ ክፍል ላሉ ተማሪዎች በየሳምንቱ እሁድ/ቅዳሜ የሚሰጥ መደበኛ የሰንበት ት/ቤት ትምህርት።",
    badge: "ብሕ/",
    icon: BookOpen,
  },
  {
    value: "Extension",
    titleAmharic: "ርቀት",
    titleEnglish: "Extension Program",
    tagline: "የወሩ 1ኛ እሁድ (2 ዓመት)",
    description: "በወር አንድ ጊዜ የሚሰጥ የ2 ዓመት የርቀት ትምህርት ኮርስ ለከፍተኛ/አዋቂ ተማሪዎች።",
    badge: "ብሕ/ር/",
    icon: Calendar,
  },
  {
    value: "SignLanguage",
    titleAmharic: "ምልክት ቋንቋ",
    titleEnglish: "Sign Language Program",
    tagline: "የምልክት ቋንቋ ትምህርት",
    description: "ለመስማት ችግር ላለባቸው ወገኖች በምልክት ቋንቋ በልዩ ሁኔታ የሚሰጥ የእሁድ ትምህርት ፕሮግራም።",
    badge: "ብሕ/ም/",
    icon: Sparkles,
  },
  {
    value: "Summer",
    titleAmharic: "የክረምት ትምህርት",
    titleEnglish: "Summer Class",
    tagline: "የክረምት ኮርስ (Grade 7)",
    description: "በክረምት እረፍት ወቅት ለ7ኛ ክፍል ተማሪዎች የሚሰጥ የተጠናከረ መንፈሳዊ ትምህርት።",
    badge: "ብሕ/ክ/",
    icon: Sun,
  },
  {
    value: "begena",
    titleAmharic: "በገና",
    titleEnglish: "BeGena Class",
    tagline: "የበገና መዝሙርና ትምህርት (6 ወር)",
    description: "በሐገር አቀባበልና ሥርዓት የሚሰጥ የ6 ወር የበገና ጥናትና የመዝሙር ትምህርት።",
    badge: "ብሕ/በ/",
    icon: Music,
  },
];

export default function StudentRegistrationWizard({
  userRole,
  onCancel,
  baseStudentPath = "/super-admin/students",
}: StudentRegistrationWizardProps) {
  const router = useRouter();
  const currentEthiopianYear = getCurrentEthiopianYear();

  // Wizard Steps: 1 = Academic Year & Classification, 2 = Class Session & Grade, 3 = Student Information, 4 = Review, 5 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 State: Academic Year & Classification
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(String(currentEthiopianYear));
  const [selectedClassification, setSelectedClassification] = useState<StudentClassification>("Regular");
  const [periods, setPeriods] = useState<any[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState<boolean>(true);

  // Step 2 State: Class / Session & Grade
  const [classSessions, setClassSessions] = useState<ClassSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  // Step 3 State: Student Personal Information
  const [formData, setFormData] = useState({
    Unique_ID: "",
    First_Name: "",
    Father_Name: "",
    Grandfather_Name: "",
    Mothers_Name: "",
    Christian_Name: "",
    photo_data_url: "",
    DOB_Date: "",
    DOB_Month: "1",
    DOB_Year: String(currentEthiopianYear - 10),
    Age: 10,
    Sex: "Male",
    Phone_Number: "",
    Occupation: "Student",
    School: "Government",
    School_Other: "",
    Educational_Background: "1-12",
    Place_of_Work: "",
    Address: "Addis Ababa",
    Address_Other: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState<boolean>(false);

  // Available Academic Years for reference
  const availableYears = useMemo(() => {
    return [
      { year: currentEthiopianYear - 1, status: "past", label: `${currentEthiopianYear - 1} ዓ.ም.` },
      { year: currentEthiopianYear, status: "current", label: `${currentEthiopianYear} ዓ.ም.` },
      { year: currentEthiopianYear + 1, status: "upcoming", label: `${currentEthiopianYear + 1} ዓ.ም.` },
    ];
  }, [currentEthiopianYear]);

  // Fetch Registration Periods when selected year changes
  useEffect(() => {
    let active = true;
    setLoadingPeriods(true);
    fetch(`/api/category-periods?academicYear=${selectedAcademicYear}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) {
          setPeriods(Array.isArray(data) ? data : []);
          setLoadingPeriods(false);
        }
      })
      .catch(() => {
        if (active) setLoadingPeriods(false);
      });
    return () => {
      active = false;
    };
  }, [selectedAcademicYear]);

  // Current classification period & status
  const currentCategoryPeriod = useMemo(() => {
    return periods.find((p) => p.classification === selectedClassification);
  }, [periods, selectedClassification]);

  const isRegistrationOpen = useMemo(() => {
    return isCategoryRegistrationOpen(currentCategoryPeriod);
  }, [currentCategoryPeriod]);

  // Fetch Class Sessions when Academic Year or Classification changes
  useEffect(() => {
    let active = true;
    setLoadingSessions(true);
    fetch(
      `/api/class-sessions?academicYear=${selectedAcademicYear}&classification=${selectedClassification}`
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ClassSessionItem[]) => {
        if (active) {
          const activeList = Array.isArray(data) ? data.filter((s) => s.isActive !== false) : [];
          setClassSessions(activeList);
          setLoadingSessions(false);

          // If current selectedSession is not in new list, reset or auto-select first
          if (activeList.length > 0) {
            setSelectedSessionId(activeList[0]._id);
            if (activeList[0].grades && activeList[0].grades.length > 0) {
              setSelectedGrade(activeList[0].grades[0]);
            }
          } else {
            setSelectedSessionId("");
            setSelectedGrade("");
          }
        }
      })
      .catch(() => {
        if (active) setLoadingSessions(false);
      });

    return () => {
      active = false;
    };
  }, [selectedAcademicYear, selectedClassification]);

  const selectedClassSession = useMemo(() => {
    return classSessions.find((s) => s._id === selectedSessionId) || null;
  }, [classSessions, selectedSessionId]);

  // When class session changes, ensure grade belongs to that session
  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    const session = classSessions.find((s) => s._id === id);
    if (session && Array.isArray(session.grades) && session.grades.length > 0) {
      if (!session.grades.includes(selectedGrade)) {
        setSelectedGrade(session.grades[0]);
      }
    } else {
      setSelectedGrade("");
    }
  };

  // DOB Age calculation in Ethiopian Calendar
  useEffect(() => {
    const y = parseInt(formData.DOB_Year, 10);
    if (!Number.isNaN(y) && y > 1900) {
      const calculatedAge = Math.max(0, currentEthiopianYear - y);
      setFormData((prev) => ({ ...prev, Age: calculatedAge }));
    }
  }, [formData.DOB_Year, currentEthiopianYear]);

  // Generate Unique ID whenever Grade, Classification, or Academic Year changes
  useEffect(() => {
    if (!selectedGrade || !selectedAcademicYear) return;

    let active = true;
    setIsGeneratingId(true);

    fetch("/api/students/count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        academicYear: selectedAcademicYear,
        grade: selectedGrade,
        classification: selectedClassification,
      }),
    })
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => {
        if (!active) return;
        const newCount = (data.count || 0) + 1;
        const year = String(selectedAcademicYear).slice(-2);
        const gradeNum = String(getGradeNumberByName(selectedGrade) || "01").padStart(2, "0");
        let gradeStream = gradeNum;

        if (selectedGrade.includes("ጥዋት") || selectedGrade.includes("Morning")) {
          gradeStream = `${gradeNum}-1`;
        } else if (selectedGrade.includes("ከሰዓት") || selectedGrade.includes("Afternoon")) {
          gradeStream = `${gradeNum}-2`;
        }

        const classPrefix = CLASSIFICATION_PREFIXES[selectedClassification] || "";
        const genId = `ብሕ/${classPrefix}${year}/${gradeStream}/${String(newCount).padStart(3, "0")}`;
        setFormData((prev) => ({ ...prev, Unique_ID: genId }));
        setIsGeneratingId(false);
      })
      .catch(() => {
        if (active) setIsGeneratingId(false);
      });

    return () => {
      active = false;
    };
  }, [selectedAcademicYear, selectedClassification, selectedGrade]);

  // Photo change handler
  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, photo_data_url: "" }));
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setFormErrors((prev) => ({ ...prev, photo: "Only JPG or PNG images are allowed." }));
      return;
    }
    if (file.size > 1_000_000) {
      setFormErrors((prev) => ({ ...prev, photo: "Photo must be less than 1MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photo_data_url: String(reader.result || "") }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Validation before going to Review
  const validateStudentInfo = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.First_Name.trim()) errors.First_Name = "First name is required.";
    if (!formData.Father_Name.trim()) errors.Father_Name = "Father's name is required.";
    if (!formData.Grandfather_Name.trim()) errors.Grandfather_Name = "Grandfather's name is required.";
    if (!formData.Mothers_Name.trim()) errors.Mothers_Name = "Mother's name is required.";
    if (!formData.Christian_Name.trim()) errors.Christian_Name = "Christian name is required.";
    if (!formData.Phone_Number.trim()) errors.Phone_Number = "Phone number is required.";
    if (!formData.Address.trim()) errors.Address = "Address is required.";
    if (!formData.DOB_Date || parseInt(formData.DOB_Date, 10) < 1 || parseInt(formData.DOB_Date, 10) > 30) {
      errors.DOB_Date = "Valid day (1–30) is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle final registration submit
  const handleFinalRegister = async () => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        Unique_ID: formData.Unique_ID,
        First_Name: formData.First_Name.trim(),
        Father_Name: formData.Father_Name.trim(),
        Grandfather_Name: formData.Grandfather_Name.trim(),
        Mothers_Name: formData.Mothers_Name.trim(),
        Christian_Name: formData.Christian_Name.trim(),
        photo_data_url: formData.photo_data_url || undefined,
        DOB_Date: String(formData.DOB_Date),
        DOB_Month: String(formData.DOB_Month),
        DOB_Year: String(formData.DOB_Year),
        Age: formData.Age,
        Sex: formData.Sex,
        Phone_Number: formData.Phone_Number.trim(),
        Occupation: formData.Occupation,
        School: formData.School === "Other" ? formData.School_Other : formData.School,
        Educational_Background: formData.Educational_Background,
        Place_of_Work: formData.Place_of_Work,
        Address: formData.Address === "Other" ? formData.Address_Other : formData.Address,
        Academic_Year: selectedAcademicYear,
        Grade: selectedGrade,
        Classification: selectedClassification,
        classSessionId: selectedSessionId,
        classSessionName: selectedClassSession ? selectedClassSession.nameAmharic || selectedClassSession.name : undefined,
        isNewStudent: true,
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || "Failed to register student");
      }

      setCreatedStudentId(resData._id);
      setCurrentStep(5); // Success step
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset wizard to register another student
  const handleRegisterAnother = () => {
    setFormData({
      Unique_ID: "",
      First_Name: "",
      Father_Name: "",
      Grandfather_Name: "",
      Mothers_Name: "",
      Christian_Name: "",
      photo_data_url: "",
      DOB_Date: "",
      DOB_Month: "1",
      DOB_Year: String(currentEthiopianYear - 10),
      Age: 10,
      Sex: "Male",
      Phone_Number: "",
      Occupation: "Student",
      School: "Government",
      School_Other: "",
      Educational_Background: "1-12",
      Place_of_Work: "",
      Address: "Addis Ababa",
      Address_Other: "",
    });
    setCreatedStudentId(null);
    setServerError(null);
    setCurrentStep(1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Student Registration Workflow
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              የአዲስ ተማሪ ምዝገባ መርሐ-ግብር · {selectedAcademicYear} ዓ.ም.
            </p>
          </div>
        </div>

        {onCancel && currentStep !== 5 && (
          <button
            type="button"
            onClick={onCancel}
            className="self-start sm:self-auto inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl px-4 py-2 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel Registration</span>
          </button>
        )}
      </div>

      {/* Interactive Progress Breadcrumbs */}
      {currentStep !== 5 && (
        <nav aria-label="Progress" className="hidden sm:block">
          <ol className="grid grid-cols-4 gap-3">
            {[
              { step: 1, title: "1. Academic & Category", amharic: "ዓ.ም. እና ምድብ" },
              { step: 2, title: "2. Session & Grade", amharic: "ክፍለ-ጊዜና ክፍል" },
              { step: 3, title: "3. Student Details", amharic: "የተማሪው መረጃ" },
              { step: 4, title: "4. Review & Register", amharic: "ማጠቃለያና ማረጋገጫ" },
            ].map((s) => {
              const isCurrent = currentStep === s.step;
              const isComplete = currentStep > s.step;
              return (
                <li
                  key={s.step}
                  className={`border-t-4 pt-2.5 transition-colors ${
                    isComplete
                      ? "border-emerald-600 text-emerald-800"
                      : isCurrent
                        ? "border-blue-600 text-blue-900 font-bold"
                        : "border-gray-200 text-gray-400"
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider block font-semibold">
                    {s.title}
                  </span>
                  <span className="text-xs text-gray-500 block truncate">{s.amharic}</span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Global Error Banner */}
      {serverError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium">{serverError}</p>
        </div>
      )}

      {/* =========================================================================
          STEP 1 — ACADEMIC YEAR & CLASSIFICATION
      ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Step 1.1: Academic Year Selection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Academic Year (የትምህርት ዘመን)
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Only the current active academic year can receive new student enrollments. Past years are historical records only.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {availableYears.map((ay) => {
                const isSelected = selectedAcademicYear === String(ay.year);
                const isCurrent = ay.status === "current";
                const isPast = ay.status === "past";
                const isUpcoming = ay.status === "upcoming";

                return (
                  <div
                    key={ay.year}
                    onClick={() => {
                      if (isCurrent) setSelectedAcademicYear(String(ay.year));
                    }}
                    className={`relative rounded-2xl p-4 border-2 transition-all ${
                      isSelected && isCurrent
                        ? "border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-100 cursor-pointer"
                        : isCurrent
                          ? "border-gray-200 bg-white hover:border-blue-400 hover:shadow-xs cursor-pointer"
                          : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black text-gray-900">{ay.label}</span>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Current
                        </span>
                      ) : isPast ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                          <Lock className="w-3 h-3" /> Past (Read-only)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Upcoming (Locked)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {isCurrent
                        ? "Active intake context for registrations"
                        : isPast
                          ? "Cannot receive new students (Historical)"
                          : "Advance configuration only (Not current)"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1.2: Classification Selection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  2
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Student Classification (የተማሪው ምድብ)
                </h2>
              </div>

              {/* Registration Status Pill */}
              {loadingPeriods ? (
                <span className="text-xs text-gray-500">Checking window...</span>
              ) : isRegistrationOpen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Registration Open (ክፍት ነው)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Registration Closed (ተዘግቷል)
                </span>
              )}
            </div>

            {/* Registration Window Details Banner */}
            {currentCategoryPeriod && (
              <div
                className={`p-4 rounded-2xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isRegistrationOpen
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-red-50/70 border-red-200 text-red-900"
                }`}
              >
                <div>
                  <p className="font-bold">
                    {isRegistrationOpen ? "🟢 Registration Open" : "🔴 Registration Closed"} ·{" "}
                    {CLASSIFICATION_ITEMS.find((c) => c.value === selectedClassification)?.titleAmharic}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    Opens: {currentCategoryPeriod.startDate || "መስከረም 1"} · Ends:{" "}
                    {currentCategoryPeriod.endDate || "መስከረም 30"} · Final Closing:{" "}
                    {currentCategoryPeriod.registrationClosedDate || "ጥቅምት 10"}
                  </p>
                </div>
                {!isRegistrationOpen && (
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-200/60 px-2.5 py-1 rounded-lg">
                    Cannot register students
                  </span>
                )}
              </div>
            )}

            {/* Classification Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CLASSIFICATION_ITEMS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedClassification === cat.value;
                const catPeriod = periods.find((p) => p.classification === cat.value);
                const isOpen = isCategoryRegistrationOpen(catPeriod);

                return (
                  <div
                    key={cat.value}
                    onClick={() => setSelectedClassification(cat.value)}
                    className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-100"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900">
                        {cat.titleAmharic} ({cat.titleEnglish})
                      </h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{cat.tagline}</p>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>Prefix: {cat.badge}</span>
                      <span className="font-semibold text-blue-600">
                        {isSelected ? "Selected ✓" : "Select"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1 Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!isRegistrationOpen}
              onClick={() => setCurrentStep(2)}
              className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold shadow-md transition-all ${
                isRegistrationOpen
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span>Continue to Class / Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2 — CLASS / SESSION & GRADE SELECTION
      ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                3
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Select Class / Session (ክፍለ-ጊዜ መርሃ-ግብር)
                </h2>
                <p className="text-xs text-gray-500">
                  Active sessions configured for {selectedAcademicYear} ዓ.ም. ({selectedClassification})
                </p>
              </div>
            </div>

            {loadingSessions ? (
              <div className="p-12 text-center text-sm text-gray-500">
                Loading available class sessions...
              </div>
            ) : classSessions.length === 0 ? (
              <div className="p-8 text-center bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="font-bold text-base">
                  No class/session is currently configured for this classification and academic year.
                </p>
                <p className="text-sm text-amber-700">
                  Please configure class sessions in Settings before registering students.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classSessions.map((session) => {
                  const isSelected = selectedSessionId === session._id;
                  const isSaturday = session.dayOfWeek === "Saturday";

                  return (
                    <div
                      key={session._id}
                      onClick={() => handleSelectSession(session._id)}
                      className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-100"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              isSaturday
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-blue-100 text-blue-900 border border-blue-200"
                            }`}
                          >
                            {isSaturday ? "ቅዳሜ — Saturday" : "እሁድ — Sunday"}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {session.session === "Morning" ? "ጠዋት (Morning)" : "ከሰዓት (Afternoon)"}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">
                          {session.nameAmharic}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">{session.name}</p>

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {session.startTime || "08:30"} – {session.endTime || "12:00"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Offered Grades ({session.grades.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {session.grades.map((g) => (
                            <span
                              key={g}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2.2: Grade Selection (ONLY grades offered by the selected session!) */}
          {selectedClassSession && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  4
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Select Grade (የክፍል ደረጃ)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Showing only grades offered by &quot;{selectedClassSession.nameAmharic}&quot;
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {selectedClassSession.grades.map((g) => {
                  const isSelected = selectedGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGrade(g)}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white font-bold shadow-md shadow-blue-200 scale-102"
                          : "border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 text-gray-800 font-semibold"
                      }`}
                    >
                      <span className="block text-sm sm:text-base">{getGradeLabel(g)}</span>
                      <span className="block text-[10px] opacity-80 mt-0.5">Grade {g}</span>
                    </button>
                  );
                })}
              </div>

              {/* Grade 7 Explicit Ambiguity Clarification Callout */}
              {(selectedGrade.includes("7") || selectedGrade.includes("ሰባተኛ")) && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      Grade 7 Placement: {selectedClassSession.nameAmharic} ({selectedClassSession.name})
                    </span>
                    <p className="text-indigo-700 mt-0.5">
                      This student will attend on{" "}
                      <strong>
                        {selectedClassSession.dayOfWeek === "Saturday" ? "ቅዳሜ (Saturday)" : "እሁድ (Sunday)"}
                      </strong>{" "}
                      ({selectedClassSession.session === "Morning" ? "ጠዋት" : "ከሰዓት"}). The class meeting day is strictly governed by the selected class session.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={!selectedSessionId || !selectedGrade}
              onClick={() => setCurrentStep(3)}
              className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold shadow-md transition-all ${
                selectedSessionId && selectedGrade
                  ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span>Continue to Student Information</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3 — STUDENT PERSONAL INFORMATION
      ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  5
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Student Personal Information (የተማሪው መረጃ)
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {isGeneratingId ? "Generating ID..." : `ID: ${formData.Unique_ID || "—"}`}
              </span>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Student Photo (JPG / PNG &lt; 1MB) · Optional
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shadow-xs">
                  {formData.photo_data_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.photo_data_url}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No Photo</span>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                    className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {formErrors.photo && (
                    <p className="text-xs text-red-600 font-medium">{formErrors.photo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Names Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  First Name (ስም) *
                </label>
                <input
                  type="text"
                  value={formData.First_Name}
                  onChange={(e) => setFormData({ ...formData, First_Name: e.target.value })}
                  placeholder="e.g. አበበ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.First_Name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.First_Name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.First_Name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Father&apos;s Name (የአባት ስም) *
                </label>
                <input
                  type="text"
                  value={formData.Father_Name}
                  onChange={(e) => setFormData({ ...formData, Father_Name: e.target.value })}
                  placeholder="e.g. ከበደ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Father_Name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Father_Name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Father_Name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Grandfather&apos;s Name (የአያት ስም) *
                </label>
                <input
                  type="text"
                  value={formData.Grandfather_Name}
                  onChange={(e) => setFormData({ ...formData, Grandfather_Name: e.target.value })}
                  placeholder="e.g. ተስፋዬ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Grandfather_Name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Grandfather_Name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Grandfather_Name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mother&apos;s Name (የእናት ስም) *
                </label>
                <input
                  type="text"
                  value={formData.Mothers_Name}
                  onChange={(e) => setFormData({ ...formData, Mothers_Name: e.target.value })}
                  placeholder="e.g. አለሚቱ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Mothers_Name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Mothers_Name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Mothers_Name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Christian Name (የክርስትና ስም) *
                </label>
                <input
                  type="text"
                  value={formData.Christian_Name}
                  onChange={(e) => setFormData({ ...formData, Christian_Name: e.target.value })}
                  placeholder="e.g. ወልደ ጊዮርጊስ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Christian_Name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Christian_Name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Christian_Name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Gender (ፆታ) *
                </label>
                <select
                  value={formData.Sex}
                  onChange={(e) => setFormData({ ...formData, Sex: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Male">Male (ወንድ)</option>
                  <option value="Female">Female (ሴት)</option>
                </select>
              </div>
            </div>

            {/* Date of Birth in Ethiopian Calendar */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Date of Birth (የትውልድ ቀን በኢትዮጵያ ዘመን አቆጣጠር) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 mb-1 block">Day (ቀን 1–30)</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.DOB_Date}
                    onChange={(e) => setFormData({ ...formData, DOB_Date: e.target.value })}
                    placeholder="e.g. 15"
                    className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                      formErrors.DOB_Date ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-gray-500 mb-1 block">Month (ወር)</span>
                  <select
                    value={formData.DOB_Month}
                    onChange={(e) => setFormData({ ...formData, DOB_Month: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {ETHIOPIAN_MONTHS.map((engMonth, i) => (
                      <option key={engMonth} value={i + 1}>
                        {ETHIOPIAN_MONTHS_AMHARIC[i]} ({engMonth})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-gray-500 mb-1 block">Year (ዓ.ም.)</span>
                  <input
                    type="number"
                    min={1900}
                    max={currentEthiopianYear}
                    value={formData.DOB_Year}
                    onChange={(e) => setFormData({ ...formData, DOB_Year: e.target.value })}
                    placeholder="e.g. 2008"
                    className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-gray-500 mb-1 block">Age (ዕድሜ)</span>
                  <div className="w-full text-sm border border-gray-200 bg-gray-50 rounded-xl p-3 font-bold text-gray-800">
                    {formData.Age} ዓመት
                  </div>
                </div>
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number (ስልክ ቁጥር) *
                </label>
                <input
                  type="text"
                  value={formData.Phone_Number}
                  onChange={(e) => setFormData({ ...formData, Phone_Number: e.target.value })}
                  placeholder="0911234567"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Phone_Number ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Phone_Number && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Phone_Number}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Address (አድራሻ) *
                </label>
                <input
                  type="text"
                  value={formData.Address}
                  onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                  placeholder="e.g. ገርጂ / ቦሌ"
                  className={`w-full text-sm border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-white ${
                    formErrors.Address ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.Address && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.Address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (validateStudentInfo()) {
                  setCurrentStep(4);
                }
              }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
            >
              <span>Review Registration Summary</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4 — REGISTRATION REVIEW BEFORE SUBMISSION (Requirement 10)
      ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Registration Summary (የምዝገባ ማጠቃለያ)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Please review all academic and personal details before finalizing registration.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                {formData.Unique_ID}
              </span>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/70 p-6 rounded-2xl border border-gray-200/80">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Student Full Name:</span>
                  <span className="text-base font-bold text-gray-900">
                    {formData.First_Name} {formData.Father_Name} {formData.Grandfather_Name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Mother&apos;s Name:</span>
                  <span className="text-sm font-semibold text-gray-800">{formData.Mothers_Name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Christian Name:</span>
                  <span className="text-sm font-semibold text-gray-800">{formData.Christian_Name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Gender & Age:</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formData.Sex} · {formData.Age} ዓመት
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Phone & Address:</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formData.Phone_Number} · {formData.Address}
                  </span>
                </div>
              </div>

              <div className="space-y-3 sm:border-l sm:border-gray-200 sm:pl-6">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Academic Year:</span>
                  <span className="text-base font-bold text-blue-900">
                    {selectedAcademicYear} ዓ.ም.
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Classification:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {CLASSIFICATION_ITEMS.find((c) => c.value === selectedClassification)?.titleAmharic} (
                    {selectedClassification})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Class / Session:</span>
                  <span className="text-base font-bold text-blue-700">
                    {selectedClassSession?.nameAmharic} ({selectedClassSession?.name})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Meeting Day & Time:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedClassSession?.dayOfWeek === "Saturday" ? "ቅዳሜ — Saturday" : "እሁድ — Sunday"}{" "}
                    · {selectedClassSession?.session === "Morning" ? "ጠዋት (Morning)" : "ከሰዓት (Afternoon)"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Grade:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                    {getGradeLabel(selectedGrade)}
                  </span>
                </div>
              </div>
            </div>

            {/* Final Confirmation Banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <p>
                Clicking <strong>&quot;Register Student&quot;</strong> will create the student record, generate an active Enrollment in {selectedAcademicYear} ዓ.ም. linked to {selectedClassSession?.nameAmharic}, and log this registration in the audit system.
              </p>
            </div>
          </div>

          {/* Step 4 Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalRegister}
              className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base font-bold shadow-lg transition-all ${
                isSubmitting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-200"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Registering Student...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Register Student (ተማሪውን መዝግብ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5 — SUCCESS CONFIRMATION (Requirement 11)
      ========================================================================= */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-md text-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 mx-auto shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Student Successfully Registered!
            </h2>
            <p className="text-sm text-gray-600 font-medium">
              ተማሪው በተሳካ ሁኔታ ተመዝግቧል · Active enrollment has been registered.
            </p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 text-sm space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Student Name:</span>
              <span className="font-bold text-gray-900">
                {formData.First_Name} {formData.Father_Name} {formData.Grandfather_Name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Unique ID:</span>
              <span className="font-mono font-bold text-blue-700">{formData.Unique_ID}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Academic Year:</span>
              <span className="font-bold text-gray-900">{selectedAcademicYear} ዓ.ም.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Class / Session:</span>
              <span className="font-bold text-blue-700">{selectedClassSession?.nameAmharic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Grade:</span>
              <span className="font-bold text-gray-900">{getGradeLabel(selectedGrade)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {createdStudentId && (
              <button
                type="button"
                onClick={() => router.push(`${baseStudentPath}/${createdStudentId}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Student</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRegisterAnother}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Another Student</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
