// src/app/admin/facilitators/add/page.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_VALUES, GRADES } from "@/lib/constants";

interface FacForm {
  name: string;
  email: string;
  password: string;
  role: string;
  grade?: string | string[];
}

export default function AddFacilitatorPage() {
  const router = useRouter();

  const [facForm, setFacForm] = useState<FacForm>({
    name: "",
    email: "",
    password: "",
    role: "Attendance Facilitator",
    grade: "Grade 1", // default can still be a single string
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "role" && value !== "Attendance Facilitator") {
      setFacForm((prev) => ({ ...prev, [name]: value, grade: undefined }));
    } else {
      setFacForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (facForm.role === "Attendance Facilitator" && !facForm.grade) {
      setError("Grade is required for Attendance Facilitators");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/facilitators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create facilitator");
      }

      alert("Facilitator added successfully!");
      router.push("/admin/facilitators");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Add New Facilitator</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* ... other form fields are correct ... */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              className="w-full p-2 border rounded"
              value={facForm.name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full p-2 border rounded"
              value={facForm.email}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              className="w-full p-2 border rounded"
              value={facForm.password}
              onChange={handleFormChange}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              className="w-full p-2 border rounded"
              value={facForm.role}
              onChange={handleFormChange}
              required
            >
              {ROLE_VALUES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {facForm.role === "Attendance Facilitator" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Assign Grades *
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded">
                {GRADES.map((grade) => (
                  <label key={grade} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(facForm.grade)
                          ? facForm.grade.includes(grade)
                          : facForm.grade === grade
                      }
                      onChange={(e) => {
                        let newGrades: string | string[] | undefined;

                        if (Array.isArray(facForm.grade)) {
                          if (e.target.checked) {
                            newGrades = [...facForm.grade, grade];
                          } else {
                            newGrades = facForm.grade.filter(
                              (g) => g !== grade
                            );
                          }
                        } else {
                          if (e.target.checked) {
                            if (facForm.grade === grade) {
                              newGrades = undefined;
                            } else if (facForm.grade) {
                              newGrades = [facForm.grade, grade];
                            } else {
                              newGrades = grade;
                            }
                          } else {
                            newGrades = undefined;
                          }
                        }

                        setFacForm((prev) => ({
                          ...prev,
                          grade:
                            newGrades &&
                            (Array.isArray(newGrades) && newGrades.length === 1
                              ? newGrades[0] // Keep single as string
                              : newGrades.length > 0
                              ? newGrades
                              : undefined),
                        }));
                      }}
                    />
                    {grade}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Facilitator"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
