//src/lib/models.ts

import { ObjectId } from "mongodb";

export interface Student {
  _id: ObjectId;
  Unique_ID: string;
  First_Name: string;
  Father_Name: string;
  Grandfather_Name: string;
  Mothers_Name: string;
  Christian_Name: string;
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
  Grade: string;
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

export type UserRole = 'admin' | 'Attendance Facilitator' | 'Education Facilitator';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
  grade?: string | string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Facilitator extends User {
  grade: string | string[];
}

export interface Subject {
  _id?: ObjectId;
  name: string;
  grade: string;
  academicYear: string;
  description?: string;
  teacherId?: string;
  students?: Student[];
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
  midTest?: number;     // 0–30
  finalExam?: number;   // 0–50
  totalScore?: number;  // 0–100
  average?: number;
  grade?: string;
  remarks?: string;
  recordedDate: string; // Ethiopian ISO
}

export type WithStringId<T> = Omit<T, "_id"> & { _id: string };