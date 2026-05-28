// src/app/education/manage-facilitators/add/page.tsx

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
    role: "Education Facilitator",
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
      router.push("/education/manage-facilitators");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white">
        <h2 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Add New Facilitator
        </h2>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={facForm.password}
              onChange={handleFormChange}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Department Role
            </label>
            <input
              type="text"
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
              value="Education Facilitator"
              disabled
            />
          </div>
          {facForm.role === "Attendance Facilitator" && (
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <label className="block text-sm font-bold text-emerald-900 mb-3">
                Assign Grades *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {GRADES.map((grade) => (
                  <label
                    key={grade}
                    className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-100"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
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
                              (g) => g !== grade,
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

          {error && (
            <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
            >
              {loading ? "Adding..." : "Add Facilitator"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-white text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all text-center hover:-translate-y-0.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
