"use client";

import { ETHIOPIAN_MONTHS } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRBAC } from "@/lib/hooks/useRBAC";
import { validatePaymentPayload } from "@/lib/validation";
import { Lock, ShieldCheck } from "lucide-react";

interface PaymentStatusTabProps {
  academicYear: string;
  studentId: string;
}

type PaymentStatusData = {
  status: "Paid" | "Not Paid";
  amount: string;
};

export default function PaymentStatusTab({
  academicYear,
  studentId,
}: PaymentStatusTabProps) {
  const { canManagePayments, role } = useRBAC();
  const [selectedYear, setSelectedYear] = useState(academicYear);
  const [availableYears, setAvailableYears] = useState<string[]>([academicYear]);
  const [paymentStatus, setPaymentStatus] = useState<
    Record<string, PaymentStatusData>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [monthlyEditCounts, setMonthlyEditCounts] = useState<Record<string, number>>({});
  const [initialStatus, setInitialStatus] = useState<Record<string, PaymentStatusData>>({});

  useEffect(() => {
    if (studentId) {
      fetch(`/api/enrollments?studentId=${studentId}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const years = Array.from(new Set([academicYear, ...data.map((d: any) => d.academicYear)]));
            setAvailableYears(years.filter(Boolean));
          }
        })
        .catch(() => {});
    }
  }, [studentId, academicYear]);

  const allMonthsLocked = ETHIOPIAN_MONTHS.filter((m) => m !== "Pagumē").every(
    (m) => (monthlyEditCounts[m] || 0) >= 2,
  );

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payment?year=${selectedYear}&studentId=${studentId}`,
        );
        if (!res.ok) throw new Error("Network response was not ok");

        const data = await res.json();
        const normalized = ETHIOPIAN_MONTHS.reduce(
          (acc, month) => {
            const serverData = data.data?.[month];
            if (typeof serverData === "object" && serverData !== null) {
              acc[month] = {
                status: serverData.status === "Paid" ? "Paid" : "Not Paid",
                amount: serverData.amount || "",
              };
            } else if (typeof serverData === "string") {
              acc[month] = {
                status: serverData === "Paid" ? "Paid" : "Not Paid",
                amount: "",
              };
            } else {
              acc[month] = { status: "Not Paid", amount: "" };
            }
            return acc;
          },
          {} as Record<string, PaymentStatusData>,
        );

        setPaymentStatus(normalized);
        setInitialStatus(normalized);
        setMonthlyEditCounts(data.monthlyEditCounts || {});
        setMessage(null);
      } catch (err) {
        console.error("Failed to load data:", err);
        setMessage("❌ Failed to load payment data.");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) fetchPaymentStatus();
  }, [academicYear, studentId]);

  const toggleStatus = (month: string) => {
    const isMonthLocked = (monthlyEditCounts[month] || 0) >= 2;
    if (!canManagePayments || isMonthLocked) return;
    setPaymentStatus((prev) => {
      const isPaidNow = prev[month]?.status === "Paid";
      return {
        ...prev,
        [month]: {
          status: isPaidNow ? "Not Paid" : "Paid",
          amount: isPaidNow ? "" : prev[month]?.amount || "",
        },
      };
    });
  };

  const updateAmount = (month: string, val: string) => {
    const isMonthLocked = (monthlyEditCounts[month] || 0) >= 2;
    if (!canManagePayments || isMonthLocked) return;
    setPaymentStatus((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        amount: val,
      },
    }));
  };

  const saveChanges = async () => {
    if (!canManagePayments) {
      setMessage("❌ Access denied: You do not have permission to manage payments.");
      return;
    }

    // Business validation (Phase 6 RBAC test alignment)
    const payload = {
      year: selectedYear,
      studentId,
      data: paymentStatus,
    };

    const validation = validatePaymentPayload(payload);
    if (!validation.valid) {
      setMessage(`❌ Validation error: ${validation.error}`);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || resData.message || "Failed to save payment status");
      }
      
      if (resData.monthlyEditCounts) {
        setMonthlyEditCounts(resData.monthlyEditCounts);
      }
      setInitialStatus(paymentStatus);
      const changedMsg = resData.changedMonths?.length
        ? ` (${resData.changedMonths.join(", ")} updated)`
        : "";
      setMessage(`✅ Payment status saved successfully${changedMsg}.`);
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${(err as Error).message || "Error saving payment status."}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="text-gray-600">Loading payment status...</p>;

  return (
    <div className="mb-6 space-y-4">
      {/* RBAC Access Header Banner */}
      {!canManagePayments ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
            <Lock className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold">Read-Only Mode ({role || "Guest"})</p>
            <p className="text-amber-700">
              Payment recording is restricted to HR Administrators and Attendance Facilitators. You can view payment history below.
            </p>
          </div>
        </div>
      ) : allMonthsLocked ? (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg w-fit">
          <Lock className="h-4 w-4" />
          <span>All Months Locked (2-Edit Limit Reached)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-fit">
          <ShieldCheck className="h-4 w-4" />
          <span>Payment Edit Authorized ({role}) · 2 Edits Allowed Per Month</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Payment Status for Academic Year {selectedYear}
          </h2>
          {availableYears.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="payment-academic-year-select" className="text-xs font-semibold text-gray-500 uppercase">
                Year:
              </label>
              <select
                id="payment-academic-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-sm font-medium border border-gray-300 rounded-lg px-2.5 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {canManagePayments && !allMonthsLocked && (
          <button
            onClick={saveChanges}
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white transition shadow-sm ${
              saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`text-sm font-medium p-3 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ETHIOPIAN_MONTHS.filter(m => m !== "Pagumē").map((month) => {
          const isPaid = paymentStatus[month]?.status === "Paid";
          const editCountForMonth = monthlyEditCounts[month] || 0;
          const isMonthLocked = editCountForMonth >= 2;

          return (
            <div
              key={month}
              className={`flex flex-col justify-between p-4 border rounded-xl shadow-sm transition-all ${
                isMonthLocked
                  ? "border-red-200 bg-red-50/20"
                  : isPaid
                  ? "border-green-300 bg-green-50/50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-semibold text-gray-800">{month}</span>
                  <span
                    className={`block text-[10px] font-semibold ${
                      isMonthLocked ? "text-red-600 font-bold" : "text-gray-400"
                    }`}
                  >
                    {isMonthLocked ? "Locked (2/2 edits used)" : `${editCountForMonth}/2 edits`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isMonthLocked && (
                    <span
                      className="p-1 rounded-full bg-red-100 text-red-600"
                      title="This month has reached its 2-edit limit and is locked"
                    >
                      <Lock className="h-3 w-3" />
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      isPaid
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}
                  >
                    {paymentStatus[month]?.status || "Not Paid"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Amount (ETB)"
                  value={paymentStatus[month]?.amount || ""}
                  onChange={(e) => updateAmount(month, e.target.value)}
                  disabled={!canManagePayments || isMonthLocked}
                  className={`w-full text-sm border rounded-lg p-2 transition ${
                    !canManagePayments || isMonthLocked
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                      : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                  }`}
                />

                {canManagePayments && (
                  isMonthLocked ? (
                    <button
                      disabled
                      type="button"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-lg border bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    >
                      Locked (Max Edits)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(month)}
                      className={`w-full text-xs font-semibold py-2 px-3 rounded-lg border transition ${
                        isPaid
                          ? "bg-white border-red-300 text-red-700 hover:bg-red-50"
                          : "bg-white border-green-400 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      Mark as {isPaid ? "Not Paid" : "Paid"}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
