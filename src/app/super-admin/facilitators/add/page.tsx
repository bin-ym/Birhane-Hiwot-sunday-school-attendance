// src/app/super-admin/facilitators/add/page.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_VALUES, GRADE_OPTIONS } from "@/lib/constants";

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
    role: "",
    grade: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      router.push("/super-admin/facilitators");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 border-b border-gray-100 pb-5">
          <h2 className="text-2xl font-bold text-gray-900">
          Add New Facilitator
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create a facilitator account and assign the role-specific access it needs.
          </p>
        </div>
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={facForm.name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={facForm.email}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={facForm.password}
              onChange={handleFormChange}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Role
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                Attendance Facilitators require one or more grades.
              </span>
            </label>
            <select
              name="role"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              value={facForm.role}
              onChange={handleFormChange}
              required
            >
              <option value="" disabled>
                Select Role...
              </option>
              {ROLE_VALUES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {facForm.role === "Attendance Facilitator" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <label className="mb-3 block text-sm font-bold text-blue-900">
                Assign Grades *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {GRADE_OPTIONS.map((grade) => (
                  <label
                    key={grade.value}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2 transition-colors hover:border-blue-100 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
                      checked={
                        Array.isArray(facForm.grade)
                          ? facForm.grade.includes(grade.value)
                          : facForm.grade === grade.value
                      }
                      onChange={(e) => {
                        let newGrades: string | string[] | undefined;

                        if (Array.isArray(facForm.grade)) {
                          if (e.target.checked) {
                            newGrades = [...facForm.grade, grade.value];
                          } else {
                            newGrades = facForm.grade.filter(
                              (g) => g !== grade.value,
                            );
                          }
                        } else {
                          if (e.target.checked) {
                            if (facForm.grade === grade.value) {
                              newGrades = undefined;
                            } else if (facForm.grade) {
                              newGrades = [facForm.grade, grade.value];
                            } else {
                              newGrades = grade.value;
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
                    {grade.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="flex gap-3 border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Facilitator"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
