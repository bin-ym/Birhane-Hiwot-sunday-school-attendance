"use client";

import { ETHIOPIAN_MONTHS } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [paymentStatus, setPaymentStatus] = useState<
    Record<string, PaymentStatusData>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/payment?year=${academicYear}&studentId=${studentId}`,
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
    setPaymentStatus((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        amount: val,
      },
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: academicYear,
          studentId,
          data: paymentStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setMessage("✅ Payment status saved successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error saving payment status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="text-gray-600">Loading payment status...</p>;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Payment Status for Academic Year {academicYear}
        </h2>
        <button
          onClick={saveChanges}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
            saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <p
          className={`mb-4 text-sm font-medium ${
            message.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ETHIOPIAN_MONTHS.map((month) => {
          const isPaid = paymentStatus[month]?.status === "Paid";
          const amountValue = paymentStatus[month]?.amount || "";

          return (
            <div
              key={month}
              className={`border rounded-xl p-4 transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between ${
                isPaid
                  ? "bg-green-100 border-green-400"
                  : "bg-red-100 border-red-400"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {month}
                </h3>
                <label className="flex items-center cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={() => toggleStatus(month)}
                    className="mr-2 w-4 h-4"
                  />
                  <span
                    className={`text-sm font-bold tracking-wide ${
                      isPaid ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {isPaid ? "Paid" : "Not Paid"}
                  </span>
                </label>
              </div>

              {isPaid && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-semibold text-green-900 mb-1">
                    Amount:
                  </label>
                  <input
                    type="number"
                    value={amountValue}
                    onChange={(e) => updateAmount(month, e.target.value)}
                    placeholder="Enter amount"
                    className="w-full text-sm p-1.5 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-gray-800"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
