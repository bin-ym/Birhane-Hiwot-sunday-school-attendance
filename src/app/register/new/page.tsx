// src/app/register/new/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Student {
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

export default function NewStudent() {
  const { status } = useSession();
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    } else if (status === "authenticated") {
      fetch("/api/students/count")
        .then((res) => res.json())
        .then((data) => {
          const newCount = data.count + 1;
          setCount(newCount);
          setFormData((prev) => ({
            ...prev,
            Unique_ID: `ብሕ/17/07/${String(newCount).padStart(2, '0')}`,
            Academic_Year: "2017",
          }));
        })
        .catch(() => setCount(0));
    }
  }, [status, formData.Unique_ID]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    if (!formData.First_Name) newErrors.push("First Name is required");
    if (!formData.Father_Name) newErrors.push("Father Name is required");
    if (!formData.Grandfather_Name) newErrors.push("Grandfather Name is required");
    if (!formData.Mothers_Name) newErrors.push("Mother's Name is required");
    if (!formData.DOB_Date || !formData.DOB_Month || !formData.DOB_Year)
      newErrors.push("Complete Date of Birth is required");
    if (!formData.Age) newErrors.push("Age is required");
    if (!formData.Sex) newErrors.push("Sex is required");
    if (!formData.Phone_Number) newErrors.push("Phone Number is required");
    if (!formData.Occupation) newErrors.push("Occupation is required");
    if (!formData.Address) newErrors.push("Address is required");
    if (!formData.Grade) newErrors.push("Grade is required");
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors([errorData.error || "Failed to register student"]);
        return;
      }

      setSuccess(true);
      setFormData({});
      setErrors([]);
      fetch("/api/students/count")
        .then((res) => res.json())
        .then((data) => {
          const newCount = data.count + 1;
          setCount(newCount);
          setFormData({
            Unique_ID: `ብሕ/17/07/${String(newCount).padStart(2, '0')}`,
            Academic_Year: "2017",
          });
        });
    } catch (error) {
      setErrors([(error as Error).message]);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">New Student Registration</h1>
      {success && (
        <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6">
          Student registered successfully!
        </div>
      )}
      {errors.length > 0 && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="Unique_ID" className="block text-sm font-medium text-gray-700 mb-1">
              ID Number
            </label>
            <input
              type="text"
              id="Unique_ID"
              name="Unique_ID"
              value={formData.Unique_ID || ""}
              readOnly
              className="w-full p-3 border rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label htmlFor="First_Name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="First_Name"
              name="First_Name"
              value={formData.First_Name || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Father_Name" className="block text-sm font-medium text-gray-700 mb-1">
              Father Name
            </label>
            <input
              type="text"
              id="Father_Name"
              name="Father_Name"
              value={formData.Father_Name || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Grandfather_Name" className="block text-sm font-medium text-gray-700 mb-1">
              Grandfather Name
            </label>
            <input
              type="text"
              id="Grandfather_Name"
              name="Grandfather_Name"
              value={formData.Grandfather_Name || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Mothers_Name" className="block text-sm font-medium text-gray-700 mb-1">
              Mother&apos;s Name
            </label>
            <input
              type="text"
              id="Mothers_Name"
              name="Mothers_Name"
              value={formData.Mothers_Name || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Christian_Name" className="block text-sm font-medium text-gray-700 mb-1">
              Christian Name
            </label>
            <input
              type="text"
              id="Christian_Name"
              name="Christian_Name"
              value={formData.Christian_Name || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="DOB_Date" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth (Day)
            </label>
            <input
              type="text"
              id="DOB_Date"
              name="DOB_Date"
              value={formData.DOB_Date || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              placeholder="DD"
            />
          </div>
          <div>
            <label htmlFor="DOB_Month" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth (Month)
            </label>
            <input
              type="text"
              id="DOB_Month"
              name="DOB_Month"
              value={formData.DOB_Month || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              placeholder="MM"
            />
          </div>
          <div>
            <label htmlFor="DOB_Year" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth (Year)
            </label>
            <input
              type="text"
              id="DOB_Year"
              name="DOB_Year"
              value={formData.DOB_Year || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              placeholder="YYYY"
            />
          </div>
          <div>
            <label htmlFor="Age" className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              type="number"
              id="Age"
              name="Age"
              value={formData.Age || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Sex" className="block text-sm font-medium text-gray-700 mb-1">
              Sex
            </label>
            <select
              id="Sex"
              name="Sex"
              value={formData.Sex || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="Phone_Number" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              id="Phone_Number"
              name="Phone_Number"
              value={formData.Phone_Number || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Class" className="block text-sm font-medium text-gray-700 mb-1">
              Class (World School)
            </label>
            <input
              type="text"
              id="Class"
              name="Class"
              value={formData.Class || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Grade" className="block text-sm font-medium text-gray-700 mb-1">
              Grade (Sunday School)
            </label>
            <select
              id="Grade"
              name="Grade"
              value={formData.Grade || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Select</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
            </select>
          </div>
          <div>
            <label htmlFor="Occupation" className="block text-sm font-medium text-gray-700 mb-1">
              Occupation
            </label>
            <input
              type="text"
              id="Occupation"
              name="Occupation"
              value={formData.Occupation || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="School" className="block text-sm font-medium text-gray-700 mb-1">
              School
            </label>
            <input
              type="text"
              id="School"
              name="School"
              value={formData.School || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="School_Other" className="block text-sm font-medium text-gray-700 mb-1">
              Other School
            </label>
            <input
              type="text"
              id="School_Other"
              name="School_Other"
              value={formData.School_Other || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Educational_Background" className="block text-sm font-medium text-gray-700 mb-1">
              Educational Background
            </label>
            <input
              type="text"
              id="Educational_Background"
              name="Educational_Background"
              value={formData.Educational_Background || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Place_of_Work" className="block text-sm font-medium text-gray-700 mb-1">
              Place of Work
            </label>
            <input
              type="text"
              id="Place_of_Work"
              name="Place_of_Work"
              value={formData.Place_of_Work || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="Address"
              name="Address"
              value={formData.Address || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Address_Other" className="block text-sm font-medium text-gray-700 mb-1">
              Other Address
            </label>
            <input
              type="text"
              id="Address_Other"
              name="Address_Other"
              value={formData.Address_Other || ""}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="Academic_Year" className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              id="Academic_Year"
              name="Academic_Year"
              value={formData.Academic_Year || ""}
              readOnly
              className="w-full p-3 border rounded-lg bg-gray-100"
            />
          </div>
        </div>
        <div className="flex justify-between">
          <Link
            href="/register"
            className="bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700"
          >
            Back
          </Link>
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}