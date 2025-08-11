import { ObjectId } from "mongodb";

export interface Student {
  _id?: ObjectId;
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