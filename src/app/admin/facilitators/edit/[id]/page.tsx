"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ROLE_VALUES = [
  { value: "Attendance Facilitator", label: "Attendance Facilitator" },
  { value: "Education Facilitator", label: "Education Facilitator" },
];

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

interface FacForm {
  name: string;
  email: string;
  password: string;
  role: string;
  grade?: string;
}

export default function EditFacilitatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [facForm, setFacForm] = useState<FacForm>({
    name: "",
    email: "",
    password: "",
    role: "Attendance Facilitator",
    grade: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/facilitators?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const user = data[0];
          setFacForm({
            name: user.name || "",
            email: user.email,
            password: "", // don't prefill
            role: user.role,
            grade: user.grade || undefined,
          });
        } else {
          setError("Facilitator not found");
        }
      })
      .catch(() => setError("Failed to load facilitator"));
  }, [id]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...facForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update facilitator");
      }

      alert("Facilitator updated successfully!");
      router.push("/admin/facilitators");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!id) {
    return <div className="p-6">No facilitator ID provided.</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Edit Facilitator</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleFormSubmit} className="space-y-4">
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
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password (Optional)</label>
            <input
              type="password"
              name="password"
              className="w-full p-2 border rounded"
              value={facForm.password}
              onChange={handleFormChange}
              placeholder="Leave blank to keep current password"
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

          {/* 👇 CONDITIONAL GRADE FIELD */}
          {facForm.role === "Attendance Facilitator" && (
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Grade *</label>
              <select
                name="grade"
                className="w-full p-2 border rounded"
                value={facForm.grade || ""}
                onChange={handleFormChange}
                required
              >
                <option value="">Select Grade</option>
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Facilitator"}
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