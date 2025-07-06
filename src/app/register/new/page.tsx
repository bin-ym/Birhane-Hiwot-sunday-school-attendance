// src/app/register/new/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Student } from "@/lib/models";
import { schools, addresses } from "@/constant";

export default function NewStudent() {
  const { status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<Student>({
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
    Class: "",
    Occupation: "",
    School: "",
    School_Other: "",
    Educational_Background: "",
    Place_of_Work: "",
    Address: "",
    Address_Other: "",
    Academic_Year: "",
    Phone_Number: "",
    Grade: "",
    Unique_ID: "",
  });
  const [setCount] = useState(0);
  const [isLoadingUniqueID, setIsLoadingUniqueID] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Student, string>>>(
    {}
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
    }
  }, [status]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      formData.Grade &&
      formData.Academic_Year &&
      /^\d{4}$/.test(formData.Academic_Year)
    ) {
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
          if (!res.ok)
            throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          const newCount = data.count + 1;
          const year = formData.Academic_Year.slice(-2); // Last two digits
          const gradeNum =
            formData.Grade.match(/\d+/)?.[0]?.padStart(2, "0") || "01";
          const newUniqueID = `ብሕ/${year}/${gradeNum}/${String(
            newCount
          ).padStart(2, "0")}`;
          setFormData((prev) => ({ ...prev, Unique_ID: newUniqueID }));
        })
        .catch((error) => {
          setCount(0);
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
  }, [status, formData.Academic_Year, formData.Grade]);

  // Calculate age from Ethiopian Calendar DOB
  useEffect(() => {
    const { DOB_Date, DOB_Month, DOB_Year } = formData;
    if (DOB_Date && DOB_Month && DOB_Year) {
      const dob = parseInt(DOB_Year);
      const currentYear = 2017; // Ethiopian Calendar year (July 2, 2025 = ~2017 EC)
      const age = currentYear - dob;
      if (age >= 0) {
        setFormData((prev) => ({ ...prev, Age: age }));
      }
    }
  }, [formData.DOB_Date, formData.DOB_Month, formData.DOB_Year]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof Student, string>> = {};
    const textFields: (keyof Student)[] = [
      "First_Name",
      "Father_Name",
      "Grandfather_Name",
      "Mothers_Name",
      "Christian_Name",
      "Sex",
      "Occupation",
      "Address",
    ];
    const numberFields: (keyof Student)[] = [
      "DOB_Date",
      "DOB_Month",
      "DOB_Year",
      "Phone_Number",
      "Academic_Year",
    ];

    // Required fields
    (Object.keys(formData) as (keyof Student)[]).forEach((key) => {
      if (
        !formData[key] &&
        key !== "School_Other" &&
        key !== "Address_Other" &&
        key !== "Educational_Background" &&
        key !== "Place_of_Work" &&
        key !== "School" &&
        key !== "Age" &&
        key !== "Class" &&
        key !== "Unique_ID"
      ) {
        newErrors[key] = `${key.replace("_", " ")} is required`;
      }
    });

    // Class required for Student
    if (formData.Occupation === "Student" && !formData.Class) {
      newErrors.Class = "Class is required for students";
    }

    // No numbers in text fields
    textFields.forEach((key) => {
      if (formData[key] && /\d/.test(formData[key] as string)) {
        newErrors[key] = `${key.replace("_", " ")} cannot contain numbers`;
      }
    });

    // Numbers only in number fields
    numberFields.forEach((key) => {
      if (formData[key] && !/^\d+$/.test(formData[key] as string)) {
        newErrors[key] = `${key.replace("_", " ")} must contain numbers only`;
      }
    });

    // Validate Academic_Year format
    if (formData.Academic_Year && !/^\d{4}$/.test(formData.Academic_Year)) {
      newErrors.Academic_Year = "Academic Year must be a 4-digit number";
    }

    // Conditional fields
    if (formData.Occupation === "Student" && !formData.School) {
      newErrors.School = "School is required for students";
    }
    if (formData.Occupation === "Worker") {
      if (!formData.Educational_Background) {
        newErrors.Educational_Background =
          "Educational Background is required for workers";
      }
      if (!formData.Place_of_Work) {
        newErrors.Place_of_Work = "Place of Work is required for workers";
      }
    }
    if (formData.Address === "Other" && !formData.Address_Other) {
      newErrors.Address_Other = "Please specify address";
    }
    if (formData.School === "Other" && !formData.School_Other) {
      newErrors.School_Other = "Please specify school";
    }
    if (!formData.Unique_ID && !isLoadingUniqueID) {
      newErrors.Unique_ID = "ID Number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicate = async () => {
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
    if (!validateForm()) {
      alert("Please fix form errors");
      return;
    }

    // Check for duplicate student
    const isDuplicate = await checkDuplicate();
    if (isDuplicate) {
      alert("Student already exists.");
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        School:
          formData.School === "Other" ? formData.School_Other : formData.School,
        Address:
          formData.Address === "Other"
            ? formData.Address_Other
            : formData.Address,
      };
      console.log("Submitting:", dataToSubmit);
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });
      if (!res.ok) throw new Error("Failed to register student");
      alert("Student registered successfully!");
      router.push("/register");
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Registration failed: ${(error as Error).message}`);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name as keyof Student)
        ? value.replace(/[^\d]/g, "")
        : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const numberFields: (keyof Student)[] = [
    "DOB_Date",
    "DOB_Month",
    "DOB_Year",
    "Phone_Number",
    "Academic_Year",
  ];

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        New Student Registration
      </h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="First_Name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="First_Name"
            name="First_Name"
            value={formData.First_Name}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., ዮሐንስ"
            required
          />
          {errors.First_Name && (
            <p className="text-red-500">{errors.First_Name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Father_Name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Father Name
          </label>
          <input
            type="text"
            id="Father_Name"
            name="Father_Name"
            value={formData.Father_Name}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., ተክለ"
            required
          />
          {errors.Father_Name && (
            <p className="text-red-500">{errors.Father_Name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Grandfather_Name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Grandfather Name
          </label>
          <input
            type="text"
            id="Grandfather_Name"
            name="Grandfather_Name"
            value={formData.Grandfather_Name}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., ዳዊት"
            required
          />
          {errors.Grandfather_Name && (
            <p className="text-red-500">{errors.Grandfather_Name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Mothers_Name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Mother&apos;s Name;
          </label>
          <input
            type="text"
            id="Mothers_Name"
            name="Mothers_Name"
            value={formData.Mothers_Name}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., ማርያም"
            required
          />
          {errors.Mothers_Name && (
            <p className="text-red-500">{errors.Mothers_Name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Christian_Name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Christian Name
          </label>
          <input
            type="text"
            id="Christian_Name"
            name="Christian_Name"
            value={formData.Christian_Name}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., ገብርኤል"
            required
          />
          {errors.Christian_Name && (
            <p className="text-red-500">{errors.Christian_Name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth (Ethiopian Calendar)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input
                type="text"
                name="DOB_Date"
                value={formData.DOB_Date}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                placeholder="Date, e.g., 15"
                required
              />
              {errors.DOB_Date && (
                <p className="text-red-500">{errors.DOB_Date}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="DOB_Month"
                value={formData.DOB_Month}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                placeholder="Month, e.g., 6"
                required
              />
              {errors.DOB_Month && (
                <p className="text-red-500">{errors.DOB_Month}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="DOB_Year"
                value={formData.DOB_Year}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                placeholder="Year, e.g., 2005"
                required
              />
              {errors.DOB_Year && (
                <p className="text-red-500">{errors.DOB_Year}</p>
              )}
            </div>
          </div>
        </div>
        <div>
          <label
            htmlFor="Age"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Age (Calculated)
          </label>
          <input
            type="number"
            id="Age"
            name="Age"
            value={formData.Age}
            readOnly
            className="p-3 border rounded-lg w-full bg-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor="Sex"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Sex
          </label>
          <select
            id="Sex"
            name="Sex"
            value={formData.Sex}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            required
          >
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.Sex && <p className="text-red-500">{errors.Sex}</p>}
        </div>
        <div>
          <label
            htmlFor="Phone_Number"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number
          </label>
          <input
            type="text"
            id="Phone_Number"
            name="Phone_Number"
            value={formData.Phone_Number}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., 0912345678"
            required
          />
          {errors.Phone_Number && (
            <p className="text-red-500">{errors.Phone_Number}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Occupation"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Occupation
          </label>
          <select
            id="Occupation"
            name="Occupation"
            value={formData.Occupation}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            required
          >
            <option value="">Select Occupation</option>
            <option value="Student">Student</option>
            <option value="Worker">Worker</option>
          </select>
          {errors.Occupation && (
            <p className="text-red-500">{errors.Occupation}</p>
          )}
        </div>
        {formData.Occupation === "Student" && (
          <>
            <div>
              <label
                htmlFor="Class"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Class (World School)
              </label>
              <select
                id="Class"
                name="Class"
                value={formData.Class}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                required
              >
                <option value="">Select Class</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`Grade ${1 + i}`}>
                    Grade {1 + i}
                  </option>
                ))}
                <option value="University">University</option>
              </select>
              {errors.Class && <p className="text-red-500">{errors.Class}</p>}
            </div>
            <div>
              <label
                htmlFor="School"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                School
              </label>
              <select
                id="School"
                name="School"
                value={formData.School}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                required
              >
                <option value="">Select School</option>
                {schools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
              {errors.School && <p className="text-red-500">{errors.School}</p>}
            </div>
            {formData.School === "Other" && (
              <div>
                <label
                  htmlFor="School_Other"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Other School
                </label>
                <input
                  type="text"
                  id="School_Other"
                  name="School_Other"
                  value={formData.School_Other}
                  onChange={handleChange}
                  className="p-3 border rounded-lg w-full"
                  required
                />
                {errors.School_Other && (
                  <p className="text-red-500">{errors.School_Other}</p>
                )}
              </div>
            )}
          </>
        )}
        {formData.Occupation === "Worker" && (
          <>
            <div>
              <label
                htmlFor="Educational_Background"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Educational Background
              </label>
              <select
                id="Educational_Background"
                name="Educational_Background"
                value={formData.Educational_Background}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                required
              >
                <option value="">Select Educational Background</option>
                <option value="1-8">1-8</option>
                <option value="9-12">9-12</option>
                <option value="University">University</option>
              </select>
              {errors.Educational_Background && (
                <p className="text-red-500">{errors.Educational_Background}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="Place_of_Work"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Place of Work
              </label>
              <select
                id="Place_of_Work"
                name="Place_of_Work"
                value={formData.Place_of_Work}
                onChange={handleChange}
                className="p-3 border rounded-lg w-full"
                required
              >
                <option value="">Select Place of Work</option>
                <option value="Government">Government</option>
                <option value="Private">Private</option>
              </select>
              {errors.Place_of_Work && (
                <p className="text-red-500">{errors.Place_of_Work}</p>
              )}
            </div>
          </>
        )}
        <div>
          <label
            htmlFor="Address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address
          </label>
          <select
            id="Address"
            name="Address"
            value={formData.Address}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            required
          >
            <option value="">Select Address</option>
            {addresses.map((address) => (
              <option key={address} value={address}>
                {address}
              </option>
            ))}
          </select>
          {errors.Address && <p className="text-red-500">{errors.Address}</p>}
        </div>
        {formData.Address === "Other" && (
          <div>
            <label
              htmlFor="Address_Other"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Other Address
            </label>
            <input
              type="text"
              id="Address_Other"
              name="Address_Other"
              value={formData.Address_Other}
              onChange={handleChange}
              className="p-3 border rounded-lg w-full"
              required
            />
            {errors.Address_Other && (
              <p className="text-red-500">{errors.Address_Other}</p>
            )}
          </div>
        )}
        <div>
          <label
            htmlFor="Grade"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Grade (Sunday School)
          </label>
          <select
            id="Grade"
            name="Grade"
            value={formData.Grade}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            required
          >
            <option value="">Select Grade</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={`Grade ${1 + i}`}>
                Grade {1 + i}
              </option>
            ))}
          </select>
          {errors.Grade && <p className="text-red-500">{errors.Grade}</p>}
        </div>
        <div>
          <label
            htmlFor="Academic_Year"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Academic Year (Ethiopian Calendar)
          </label>
          <input
            type="text"
            id="Academic_Year"
            name="Academic_Year"
            value={formData.Academic_Year}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
            placeholder="e.g., 2017"
            required
          />
          {errors.Academic_Year && (
            <p className="text-red-500">{errors.Academic_Year}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="Unique_ID"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ID Number
          </label>
          <input
            type="text"
            id="Unique_ID"
            name="Unique_ID"
            value={formData.Unique_ID || ""}
            readOnly
            className="p-3 border rounded-lg w-full bg-gray-100"
            disabled={isLoadingUniqueID}
          />
          {isLoadingUniqueID && (
            <p className="text-gray-500 text-sm mt-1">Generating ID...</p>
          )}
          {errors.Unique_ID && (
            <p className="text-red-500">{errors.Unique_ID}</p>
          )}
        </div>
        <div className="col-span-2 flex gap-4 mt-4">
          <button
            type="submit"
            className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            disabled={isLoadingUniqueID}
          >
            Register Student
          </button>
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
