"use client";

import { useEffect, useState, useCallback } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { validateEnrollmentPayload } from "@/lib/validation";
import { getCurrentEthiopianYear } from "@/lib/utils";
import { StudentClassification } from "@/lib/models";
import { Lock, ShieldCheck, Plus, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";

interface EnrollmentRecord {
  id?: string;
  _id?: string;
  studentId: string;
  academicYear: string;
  classification: StudentClassification;
  grade: string;
  gradeNumber?: number;
  section?: string | null;
  status?: "Active" | "Completed" | "Dropped" | "Transferred";
  createdAt?: string;
}

interface EnrollmentTabProps {
  studentId: string;
  currentAcademicYear?: string;
}

const CLASSIFICATIONS: StudentClassification[] = [
  "Regular",
  "Extension",
  "SignLanguage",
  "Summer",
  "begena",
];

export default function EnrollmentTab({
  studentId,
  currentAcademicYear,
}: EnrollmentTabProps) {
  const { canManageEnrollment, role } = useRBAC();
  const currentYear = currentAcademicYear || String(getCurrentEthiopianYear());

  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New enrollment form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [classification, setClassification] = useState<StudentClassification>("Regular");
  const [grade, setGrade] = useState("Grade 1");
  const [section, setSection] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit section state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSectionValue, setEditSectionValue] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/enrollments?studentId=${studentId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load enrollments");
      }
      const data = await res.json();
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load enrollment history");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEnrollment) {
      setError("Permission denied: Only Education Admin and Super Admin can create enrollments.");
      return;
    }

    const payload = {
      studentId,
      academicYear: academicYear.trim(),
      classification,
      grade: grade.trim(),
      section: section.trim() ? section.trim().toUpperCase() : null,
    };

    // Phase 7 validation
    const validation = validateEnrollmentPayload(payload);
    if (!validation.valid) {
      setError(validation.error || "Invalid enrollment payload");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create enrollment");
      }

      setSuccess("✅ Enrollment record created successfully.");
      setShowAddForm(false);
      setSection("");
      await fetchEnrollments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSection = async (enrollmentId: string) => {
    if (!canManageEnrollment) return;
    setSavingSection(true);
    setError(null);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: editSectionValue.trim().toUpperCase() || null }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update section");
      }

      setSuccess("✅ Section updated successfully.");
      setEditingId(null);
      await fetchEnrollments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RBAC Access Notice */}
      {!canManageEnrollment ? (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-blue-900 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-200 text-blue-800">
            <Lock className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold">Read-Only Mode ({role || "Staff"})</p>
            <p className="text-blue-700">
              Enrollment operations (adding academic years and assigning sections) are restricted to Education Administrators.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="h-4 w-4" />
            <span>Enrollment Management Authorized ({role})</span>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? "Cancel" : "New Enrollment"}</span>
          </button>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add New Enrollment Form */}
      {showAddForm && canManageEnrollment && (
        <form
          onSubmit={handleCreateEnrollment}
          className="p-5 border border-blue-200 bg-blue-50/40 rounded-2xl shadow-sm space-y-4"
        >
          <h3 className="font-bold text-gray-900 text-base">Register Academic Year Enrollment</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="2027"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Classification
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as StudentClassification)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Grade
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Grade 5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Section (Optional, e.g. A, B)
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                maxLength={4}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                placeholder="A"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? "Saving..." : "Save Enrollment"}
            </button>
          </div>
        </form>
      )}

      {/* Enrollment History Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Enrollment Records</h3>
          <span className="text-xs text-gray-500 font-medium">
            {enrollments.length} {enrollments.length === 1 ? "record" : "records"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading enrollment records...</div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No enrollment records found for this student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Status</th>
                  {canManageEnrollment && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {enrollments.map((en) => {
                  const id = en.id || en._id || "";
                  const isEditingThis = editingId === id;

                  return (
                    <tr key={id || `${en.academicYear}-${en.grade}`} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3.5 font-bold text-gray-900">{en.academicYear}</td>
                      <td className="px-4 py-3.5 text-gray-700">{en.classification}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">{en.grade}</td>
                      <td className="px-4 py-3.5">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editSectionValue}
                              onChange={(e) => setEditSectionValue(e.target.value)}
                              maxLength={4}
                              className="w-16 border rounded p-1 text-xs uppercase"
                              placeholder="Sec"
                            />
                            <button
                              onClick={() => handleUpdateSection(id)}
                              disabled={savingSection}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold text-blue-700">
                            {en.section ? `Section ${en.section}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {en.status || "Active"}
                        </span>
                      </td>
                      {canManageEnrollment && (
                        <td className="px-4 py-3.5 text-right">
                          {!isEditingThis && id && (
                            <button
                              onClick={() => {
                                setEditingId(id);
                                setEditSectionValue(en.section || "");
                              }}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit Section</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
