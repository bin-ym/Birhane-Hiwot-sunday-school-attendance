"use client";

import { useEffect, useState } from "react";
// ✅ FIX 1: Import useParams in addition to useRouter
import { useRouter, useParams } from "next/navigation";
import { GRADE_OPTIONS, ROLE_VALUES } from "@/lib/constants";

interface FacForm {
  name: string;
  email: string;
  password: string;
  role: string;
  grade?: string | string[];
}

// ✅ FIX 2: Remove all props from the component's signature
export default function EditFacilitatorPage() {
  const router = useRouter();
  // ✅ FIX 3: Get the dynamic route parameters using the hook
  const params = useParams();
  const id = params.id as string; // We know 'id' will be a string here

  const [facForm, setFacForm] = useState<FacForm>({
    name: "",
    email: "",
    password: "",
    role: "Education Facilitator",
    grade: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The rest of your component logic is PERFECT and does not need to change.
  // It will work correctly with the `id` we got from the useParams hook.
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetch(`/api/facilitators?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Facilitator not found");
        return res.json();
      })
      .then((user) => {
        if (!user || user.error) {
          setError("Facilitator not found");
          return;
        }
        setFacForm({
          name: user.name || "",
          email: user.email,
          password: "",
          role: user.role,
          grade: user.grade || undefined,
        });
      })
      .catch(() => setError("Failed to load facilitator data"))
      .finally(() => setLoading(false));
  }, [id]);

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

  const handleGradeChange = (grade: string, checked: boolean) => {
    setFacForm((prev) => {
      const currentGrades = Array.isArray(prev.grade)
        ? prev.grade
        : prev.grade
          ? [prev.grade]
          : [];

      let newGrades: string[] = [];
      if (checked) {
        newGrades = [...currentGrades, grade];
      } else {
        newGrades = currentGrades.filter((g) => g !== grade);
      }

      const finalGrades =
        newGrades.length === 1
          ? newGrades[0]
          : newGrades.length > 1
            ? newGrades
            : undefined;

      return { ...prev, grade: finalGrades };
    });
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...facForm }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update facilitator");
      }

      alert("Facilitator updated successfully!");
      router.push("/education/manage-facilitators");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !facForm.email) {
    return <div className="p-6">Loading facilitator details...</div>;
  }

  if (!id) {
    return <div className="p-6">No facilitator ID provided.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Facilitator</h1>
          <p className="text-gray-500 mt-1">Update facilitator information and assignments</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 outline-none"
                value={facForm.name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                value={facForm.email}
                onChange={handleFormChange}
                required
                disabled
              />
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
                <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="password"
                name="password"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 outline-none"
                value={facForm.password}
                onChange={handleFormChange}
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department Role</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium"
                value={facForm.role}
                disabled
              />
            </div>

            {facForm.role === "Attendance Facilitator" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign Grades *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-200 p-4 rounded-xl bg-gray-50/50">
                  {GRADE_OPTIONS.map((grade) => (
                    <label key={grade.value} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        checked={
                          Array.isArray(facForm.grade)
                            ? facForm.grade.includes(grade.value)
                            : facForm.grade === grade.value
                        }
                        onChange={(e) =>
                          handleGradeChange(grade.value, e.target.checked)
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">{grade.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Update Facilitator"
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
