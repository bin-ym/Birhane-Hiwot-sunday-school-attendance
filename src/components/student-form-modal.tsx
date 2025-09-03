"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Student {
  _id: string;
  name: string;
  studentId: string;
  grade: string;
  academicYear: string;
}

interface StudentFormModalProps {
  student: Student | null; // 👈 fix
  onClose: () => void;
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>;
}

export function StudentFormModal({ student, onClose, onSave }: StudentFormModalProps) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name);
      setStudentId(student.studentId);
      setGrade(student.grade);
      setAcademicYear(student.academicYear);
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, studentId, grade, academicYear });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {student ? "Edit Student" : "Add Student"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
          <Input
            placeholder="Grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            required
          />
          <Input
            placeholder="Academic Year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
