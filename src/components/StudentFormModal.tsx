"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Student } from "@/lib/models";

interface StudentFormModalProps {
  student: Student | null;
  onClose: () => void;
  onSave: (studentData: Omit<Student, "_id">) => Promise<void>;
}

export function StudentFormModal({ student, onClose, onSave }: StudentFormModalProps) {
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
    Educational_Background: "",
    Address: "",
    Academic_Year: "",
    Grade: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        Educational_Background: student.Educational_Background || "",
        Address: student.Address || "",
        Academic_Year: student.Academic_Year || "",
        Grade: student.Grade || "",
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const requiredFields = [
        "Unique_ID",
        "First_Name",
        "Father_Name",
        "Grandfather_Name",
        "Mothers_Name",
        "Christian_Name",
        "DOB_Date",
        "DOB_Month",
        "DOB_Year",
        "Age",
        "Sex",
        "Phone_Number",
        "Class",
        "Occupation",
        "Address",
        "Academic_Year",
        "Grade",
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof Omit<Student, "_id">]) {
          throw new Error(`${field.replace(/_/g, " ")} is required`);
        }
      }

      await onSave(formData);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "Age" ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative overflow-y-auto max-h-[80vh]">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4">
          {student ? "Edit Student" : "Add Student"}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium">Unique ID</span>
            <Input
              name="Unique_ID"
              placeholder="Unique ID"
              className="p-3 border rounded-lg"
              value={formData.Unique_ID}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">First Name</span>
            <Input
              name="First_Name"
              placeholder="First Name"
              className="p-3 border rounded-lg"
              value={formData.First_Name}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Father Name</span>
            <Input
              name="Father_Name"
              placeholder="Father Name"
              className="p-3 border rounded-lg"
              value={formData.Father_Name}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Grandfather Name</span>
            <Input
              name="Grandfather_Name"
              placeholder="Grandfather Name"
              className="p-3 border rounded-lg"
              value={formData.Grandfather_Name}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Mother&apos;s Name</span>
            <Input
              name="Mothers_Name"
              placeholder="Mother's Name"
              className="p-3 border rounded-lg"
              value={formData.Mothers_Name}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Christian Name</span>
            <Input
              name="Christian_Name"
              placeholder="Christian Name"
              className="p-3 border rounded-lg"
              value={formData.Christian_Name}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <div className="flex gap-4">
            <label className="flex flex-col flex-1">
              <span className="text-sm font-medium">DOB Date</span>
              <Input
                name="DOB_Date"
                placeholder="DD"
                className="p-3 border rounded-lg"
                value={formData.DOB_Date}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </label>
            <label className="flex flex-col flex-1">
              <span className="text-sm font-medium">DOB Month</span>
              <Input
                name="DOB_Month"
                placeholder="MM"
                className="p-3 border rounded-lg"
                value={formData.DOB_Month}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </label>
            <label className="flex flex-col flex-1">
              <span className="text-sm font-medium">DOB Year</span>
              <Input
                name="DOB_Year"
                placeholder="YYYY"
                className="p-3 border rounded-lg"
                value={formData.DOB_Year}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Age</span>
            <Input
              name="Age"
              type="number"
              placeholder="Age"
              className="p-3 border rounded-lg"
              value={formData.Age}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Sex</span>
            <select
              name="Sex"
              className="p-3 border rounded-lg"
              value={formData.Sex}
              onChange={handleChange}
              required
              aria-required="true"
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Phone Number</span>
            <Input
              name="Phone_Number"
              placeholder="Phone Number"
              className="p-3 border rounded-lg"
              value={formData.Phone_Number}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Class</span>
            <Input
              name="Class"
              placeholder="Class"
              className="p-3 border rounded-lg"
              value={formData.Class}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Occupation</span>
            <Input
              name="Occupation"
              placeholder="Occupation"
              className="p-3 border rounded-lg"
              value={formData.Occupation}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">School (Optional)</span>
            <Input
              name="School"
              placeholder="School"
              className="p-3 border rounded-lg"
              value={formData.School}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Educational Background (Optional)</span>
            <Input
              name="Educational_Background"
              placeholder="Educational Background"
              className="p-3 border rounded-lg"
              value={formData.Educational_Background}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Address</span>
            <Input
              name="Address"
              placeholder="Address"
              className="p-3 border rounded-lg"
              value={formData.Address}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Academic Year</span>
            <Input
              name="Academic_Year"
              placeholder="Academic Year"
              className="p-3 border rounded-lg"
              value={formData.Academic_Year}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium">Grade</span>
            <Input
              name="Grade"
              placeholder="Grade"
              className="p-3 border rounded-lg"
              value={formData.Grade}
              onChange={handleChange}
              required
              aria-required="true"
            />
          </label>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              aria-label={student ? "Update student" : "Add student"}
            >
              {loading ? "Saving..." : student ? "Update Student" : "Add Student"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}