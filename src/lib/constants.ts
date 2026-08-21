//src/lib/constants.ts

/** Use "all_days" for testing; switch to "sundays_only" for production attendance. */
export const ATTENDANCE_CALENDAR_MODE: "all_days" | "sundays_only" = "all_days";

/** A grade option: canonical Amharic value (what is stored in the DB), a display label, and its numeric grade. */
export interface GradeOption {
  value: string;
  label: string;
  number: number;
}

/**
 * All grades with English labels and numeric grade numbers.
 * Both "ሰባተኛ ክፍል ጥዋት" and "ሰባተኛ ክፍል ከሰዓት" are treated as Grade 7.
 */
export const GRADE_OPTIONS: GradeOption[] = [
  { value: "ቅድመ መደበኛ", label: "ቅድመ መደበኛ · Grade 0", number: 0 },
  { value: "አንደኛ ክፍል", label: "አንደኛ ክፍል · Grade 1", number: 1 },
  { value: "ሁለተኛ ክፍል", label: "ሁለተኛ ክፍል · Grade 2", number: 2 },
  { value: "ሦስተኛ ክፍል", label: "ሦስተኛ ክፍል · Grade 3", number: 3 },
  { value: "አራተኛ ክፍል", label: "አራተኛ ክፍል · Grade 4", number: 4 },
  { value: "አምስተኛ ክፍል", label: "አምስተኛ ክፍል · Grade 5", number: 5 },
  { value: "ስድስተኛ ክፍል", label: "ስድስተኛ ክፍል · Grade 6", number: 6 },
  { value: "ሰባተኛ ክፍል ጥዋት", label: "ሰባተኛ ክፍል ጥዋት · 7-1", number: 7 },
  { value: "ሰባተኛ ክፍል ከሰዓት", label: "ሰባተኛ ክፍል ከሰዓት · 7-2", number: 7 },
  { value: "ስምንተኛ ክፍል", label: "ስምንተኛ ክፍል · Grade 8", number: 8 },
  { value: "ዘጠነኛ ክፍል", label: "ዘጠነኛ ክፍል · Grade 9", number: 9 },
  { value: "አስረኛ ክፍል", label: "አስረኛ ክፍል · Grade 10", number: 10 },
  { value: "አስራ አንደኛ ክፍል", label: "አስራ አንደኛ ክፍል · Grade 11", number: 11 },
  { value: "አስራ ሁለተኛ ክፍል", label: "አስራ ሁለተኛ ክፍል · Grade 12", number: 12 },
];

/** Canonical Amharic grade names, in the same order as GRADE_OPTIONS. Kept as the stored value / type source. */
export const GRADES: string[] = GRADE_OPTIONS.map((g) => g.value);

/** Grade options specific to each student classification */
export const CLASSIFICATION_GRADE_OPTIONS: Record<
  StudentClassification,
  GradeOption[]
> = {
  Regular: GRADE_OPTIONS,
  Extension: [
    { value: "1ኛ ዓመት", label: "1ኛ ዓመት · Level 1", number: 1 },
    { value: "2ኛ ዓመት", label: "2ኛ ዓመት · Level 2", number: 2 },
  ],
  SignLanguage: [
    { value: "ምልክት ቋንቋ", label: "ምልክት ቋንቋ · Sign Language Class", number: 1 },
  ],
  Summer: [
    { value: "ሰባተኛ ክፍል ጥዋት", label: "ሰባተኛ ክፍል ጥዋት · 7-1", number: 7 },
    { value: "ሰባተኛ ክፍል ከሰዓት", label: "ሰባተኛ ክፍል ከሰዓት · 7-2", number: 7 },
  ],
};

/** Look up the numeric grade for an Amharic grade name across all classifications. */
export function getGradeNumberByName(gradeName: string): number {
  if (gradeName === "1ኛ ዓመት") return 1;
  if (gradeName === "2ኛ ዓመት") return 2;
  if (gradeName === "ምልክት ቋንቋ") return 1;
  return GRADE_OPTIONS.find((g) => g.value === gradeName)?.number ?? 0;
}

/** Look up the display label for an Amharic grade name across all classifications. */
export function getGradeLabel(gradeName: string): string {
  if (gradeName === "1ኛ ዓመት") return "1ኛ ዓመት · Level 1";
  if (gradeName === "2ኛ ዓመት") return "2ኛ ዓመት · Level 2";
  if (gradeName === "ምልክት ቋንቋ") return "ምልክት ቋንቋ · Sign Language Class";
  return GRADE_OPTIONS.find((g) => g.value === gradeName)?.label ?? gradeName;
}

export const ROLE_VALUES = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
  { value: "Education Facilitator", label: "Education Facilitator" },
];

/** Student classification types */
export type StudentClassification =
  | "Regular"
  | "Extension"
  | "SignLanguage"
  | "Summer";

export const STUDENT_CLASSIFICATIONS: {
  value: StudentClassification;
  label: string;
  description: string;
}[] = [
  {
    value: "Regular",
    label: "Regular",
    description: "Standard Sunday school classes",
  },
  {
    value: "Extension",
    label: "Extension",
    description: "First Sunday of every month (Ethiopian calendar) except 13th",
  },
  {
    value: "SignLanguage",
    label: "Sign Language",
    description: "Every Sunday with sign language support",
  },
  {
    value: "Summer",
    label: "Summer Class",
    description: "Summer session classes",
  },
];

/** Attendance schedule for each classification */
export const CLASSIFICATION_SCHEDULE: Record<StudentClassification, string> = {
  Regular: "Every Sunday",
  Extension: "First Sunday of every month (except 13th)",
  SignLanguage: "Every Sunday (with sign language)",
  Summer: "Summer session schedule",
};

export const schools = [
  "ሀና",
  "ሀፒ ቪሌጄ",
  "ሂልሳይድ",
  "ህዳሴ",
  "ሆም ላንድ",
  "ሊዜም",
  "መሪ",
  "ሚሽን",
  "ማርቭል",
  "ሜሪኦን",
  "ምስራቅ",
  "ሰላም",
  "ሳንፎርድ",
  "ሳፋሪ",
  "ስኩል ኦፍ ቱምሮ",
  "ሮፋም",
  "ሽቡአጆርሳ",
  "ቅኔ",
  "ቅዱስ ሚካኤል",
  "ቅድስት ሬዛ",
  "በሻሌ",
  "ቤስት",
  "ቦሌ አዲስ",
  "ነዋይ",
  "ኒሺኒ ሆፕ",
  "ኒው ሰንላይት",
  "ናዝሬት",
  "አቡነ ጎርጎርዮስ",
  "አንድነት",
  "ኢትዮ ፓረንት",
  "እርግብ",
  "ኦዞን",
  "ኪዳነ ምሕረት",
  "ኪፓስ",
  "ካራሎ",
  "ወንድይራድ",
  "ውለታ",
  "የኒፎርም",
  "ያንግሩት",
  "ዳይመንድ",
  "ዴሊቨራንስ",
  "ጂባ",
  "ጊብሰን",
  "ግሎሪ",
  "ጽዮን ማርያም",
  "ፋውንቴን",
  "ፌርዌይ",
  "ፓንቶ ኮርቶር",
  "ፓንቶክራቶን",
  "ቪዥን",
  "ኤልቤተል",
  "ስላሴ ካቴድራል",
  "ሚሸን",
  "72",
  "ራዕይ",
  "ቤዛ",
  "ቡርቃ ቦሬ",
  "ሚካኤል",
  "ኤደን",
  "ፊውቸር የዝ",
  "Other",
].map((school) => ({ value: school, label: school }));

export const addresses = [
  "ጥቁር አባይ/ሚካኤል ጀርባ አካባቢ",
  "ሲቪል ሰርቪስ አካባቢ",
  "ወንድይራድ ት/ቤት አካባቢ",
  "ታቦት ማደሪያ/ኮተቤ ኮሌጅ አካባቢ",
  "ወሰን/አቅም ግንባታ አካባቢ",
  "አልታድ (ፊጋ) አካባቢ",
  "ሴፍ የመኖሪያ ቤቶች አካባቢ",
  "የተባበሩት አካባቢ",
  "ሰሚት አካባቢ",
  "ሲኤምሲ",
  "መሪ",
  "ላምበረት",
  "02",
  "ሰባ ሁለት",
  "ኢትዮ ዋልስ",
  "ሎቄ",
  "ኢትዮ ዊልስ",
  "አቤም",
  "ጣፎ",
  "ሰአሊተ ምሕረት",
  "አያት",
  "ካራ",
  "አባዶ",
  "Other",
].map((address) => ({ value: address, label: address }));
