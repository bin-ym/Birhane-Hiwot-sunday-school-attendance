//src/lib/models.ts

import { ObjectId } from "mongodb";
import { GRADES } from "./constants";
export type StudentClassification =
  | "Regular"
  | "Extension"
  | "SignLanguage"
  | "Summer"
  | "begena";

export interface Student {
  _id: ObjectId;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
  photo_data_url?: string;
  DOB_Date: string;
  DOB_Month: string;
  DOB_Year: string;
  Age: number;
  Sex: string;
  Phone_Number: string;
  Class: string;
  Occupation: string;
  School?: string;
  School_Other?: string;
  Educational_Background?: string;
  Place_of_Work?: string;
  Address: string;
  Address_Other?: string;
  Academic_Year: string;
  Grade: (typeof GRADES)[number];
  Classification?: StudentClassification;
  qr_code?: string;
}

export type EnrollmentStatus =
  | "active"
  | "completed"
  | "withdrawn"
  | "historical"
  | "repeated";

export type InsufficientDataPolicy =
  | "block"
  | "manual_review"
  | "auto_approve";

export type PromotionDecisionType =
  | "promote"
  | "repeat"
  | "complete"
  | "withdraw"
  | "exception"
  | "review_required";

export type PromotionDecisionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved";

export interface Enrollment {
  _id?: ObjectId;
  studentId: ObjectId;
  academicYear: string;
  classification: StudentClassification;
  programCode?: string;
  grade: string;
  gradeNumber?: number;
  section?: string | null;
  uniqueId: string;
  status: EnrollmentStatus;
  isCurrent: boolean;
  previousEnrollmentId?: ObjectId;
  nextEnrollmentId?: ObjectId;
  promotionDecisionId?: ObjectId;
  qrCode?: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionPolicy {
  _id?: ObjectId;
  classification: StudentClassification;
  active: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  academicWeight: number;
  attendanceWeight: number;
  minimumPromotionScore: number;
  minimumAcademicScore: number;
  minimumAttendanceScore: number;
  insufficientDataPolicy: InsufficientDataPolicy;
  allowRepeat: boolean;
  allowException: boolean;
  terminalLevels?: Array<string | number>;
  gradeProgression?: Array<{
    from: string;
    to: string | null;
    isTerminal?: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionDecision {
  _id?: ObjectId;
  studentId: ObjectId;
  fromEnrollmentId: ObjectId;
  toEnrollmentId?: ObjectId;
  academicYear: string;
  classification: StudentClassification;
  decisionType: PromotionDecisionType;
  status: PromotionDecisionStatus;
  academicScore?: number;
  attendanceScore?: number;
  weightedScore?: number;
  policyId?: ObjectId;
  minimumPromotionScore?: number;
  minimumAcademicScore?: number;
  minimumAttendanceScore?: number;
  isEligible: boolean;
  reason?: string;
  reviewerUserId?: string;
  reviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentRequest {
  _id?: ObjectId;
  studentData: Omit<Student, "_id">;
  requestedBy: string; // UserRole
  requestedByName: string; // User's name
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  rejectionReason?: string;
}
export interface Attendance {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason?: string;
  markedBy?: string;
  timestamp?: string;
}

export interface Payment {
  _id?: ObjectId;
  studentId: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
  description?: string;
}

export type UserRole =
  | "Super Admin"
  | "HR Admin"
  | "Education Admin"
  | "Attendance Facilitator"
  | "Education Facilitator"
  | "Teacher";

/** Category registration period settings — managed by Super Admin */
export interface CategoryPeriod {
  _id?: ObjectId;
  classification: StudentClassification;
  academicYear: string;
  startDate: string; // ISO date string or Ethiopian date
  endDate: string; // ISO date string or Ethiopian date
  registrationClosedDate: string; // When registration closes
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  grade?: string | string[]; // for Attendance Facilitator/Education Facilitator
  assignedSubjects?: string[]; // Arrays of _ids or names of subjects assigned to a Teacher
  canAddStudent?: boolean; // Determines if the HR Facilitator has allowed them to create students
  createdAt?: string;
  updatedAt?: string;
}
export interface Facilitator extends User {
  grade: string | string[];
  canAddStudent?: boolean;
}

export interface Subject {
  _id?: ObjectId;
  name: string;
  grade: string;
  gradeNumber?: number;
  academicYear: string;
  description?: string;
  teacherId?: string;
  students?: Student[];
}

/** Grouped subject document — one per academicYear + grade. */
export interface SubjectGroup {
  _id?: ObjectId;
  academicYear: string;
  grade: string;
  gradeNumber?: number;
  subjects: string[];
}
export interface Result {
  _id: ObjectId;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  assignment1: number;
  assignment2: number;
  midTest: number;
  finalExam: number;
  totalScore: number;
  grade: string;
  remarks?: string;
  recordedDate: string;
}

export interface StudentResult {
  _id?: ObjectId;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  assignment1?: number; // 0–10
  assignment2?: number; // 0–10
  midTest?: number; // 0–30
  finalExam?: number; // 0–50
  totalScore?: number; // 0–100
  average?: number;
  grade?: string;
  remarks?: string;
  recordedDate: string; // Ethiopian ISO
}

export type WithStringId<T> = Omit<T, "_id"> & { _id: string };
