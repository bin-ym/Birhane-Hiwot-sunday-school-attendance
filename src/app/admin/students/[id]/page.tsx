"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Student, Attendance, Payment } from "@/lib/models";
import { gregorianToEthiopianDate, getSundaysInEthiopianYear } from "@/lib/utils";

export default function StudentDetails() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Details" | "Attendance" | "Payment Status">("Details");
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: "",
    present: true,
    hasPermission: false,
    reason: "",
    markedBy: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    date: "",
    status: "Paid" as "Paid" | "Pending" | "Overdue",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [sundays, setSundays] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch student details
        const studentRes = await fetch(`/api/students/${id}`);
        console.log("Student API Response Status:", studentRes.status);
        if (!studentRes.ok) throw new Error(`Student fetch error! Status: ${studentRes.status}`);
        const studentData = await studentRes.json();
        console.log("Student API Response Data:", studentData);
        setStudent(studentData);

        // Fetch attendance records
        const attendanceRes = await fetch(`/api/students/${id}/attendance`);
        console.log("Attendance API Response Status:", attendanceRes.status);
        if (!attendanceRes.ok) throw new Error(`Attendance fetch error! Status: ${attendanceRes.status}`);
        const attendanceData = await attendanceRes.json();
        console.log("Attendance API Response Data:", attendanceData);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

        // Fetch payment records
        const paymentsRes = await fetch(`/api/students/${id}/payments`);
        console.log("Payments API Response Status:", paymentsRes.status);
        if (!paymentsRes.ok) throw new Error(`Payments fetch error! Status: ${paymentsRes.status}`);
        const paymentsData = await paymentsRes.json();
        console.log("Payments API Response Data:", paymentsData);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);

        // Generate Sundays for the academic year
        if (studentData.Academic_Year) {
          const sundaysList = getSundaysInEthiopianYear(studentData.Academic_Year);
          setSundays(sundaysList);
        }

        setError(null);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch(`/api/students/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attendanceForm, studentId: id }),
      });
      console.log("Attendance POST Response Status:", res.status);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add attendance record");
      }
      const newRecord = await res.json();
      console.log("New Attendance Record:", newRecord);
      setAttendance([...attendance, newRecord]);
      setShowAttendanceForm(false);
      setAttendanceForm({
        date: "",
        present: true,
        hasPermission: false,
        reason: "",
        markedBy: "",
      });
    } catch (err) {
      console.error("Attendance Form Error:", err);
      setFormError((err as Error).message);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch(`/api/students/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...paymentForm, studentId: id }),
      });
      console.log("Payment POST Response Status:", res.status);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add payment record");
      }
      const newRecord = await res.json();
      console.log("New Payment Record:", newRecord);
      setPayments([...payments, newRecord]);
      setShowPaymentForm(false);
      setPaymentForm({
        amount: 0,
        date: "",
        status: "Paid",
        description: "",
      });
    } catch (err) {
      console.error("Payment Form Error:", err);
      setFormError((err as Error).message);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Details":
        if (!student) return <div className="text-gray-600">No student data available</div>;
        return (
          <div className="grid grid-cols-2 gap-4">
            <p><strong>Unique ID:</strong> {student.Unique_ID}</p>
            <p><strong>Mother's Name:</strong> {student.Mothers_Name}</p>
            <p><strong>DOB:</strong> {`${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year}`}</p>
            <p><strong>Age:</strong> {student.Age}</p>
            <p><strong>Sex:</strong> {student.Sex}</p>
            <p><strong>Phone Number:</strong> {student.Phone_Number}</p>
            <p><strong>Class:</strong> {student.Class}</p>
            <p><strong>Occupation:</strong> {student.Occupation}</p>
            <p><strong>School:</strong> {student.School || "-"}</p>
            <p><strong>Educational Background:</strong> {student.Educational_Background || "-"}</p>
            <p><strong>Address:</strong> {student.Address}</p>
            <p><strong>Academic Year:</strong> {student.Academic_Year}</p>
            <p><strong>Grade:</strong> {student.Grade}</p>
          </div>
        );
      case "Attendance":
        return (
          <div>
            <div className="flex justify-end mb-4">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                onClick={() => setShowAttendanceForm(!showAttendanceForm)}
                aria-label={showAttendanceForm ? "Close attendance form" : "Add attendance record"}
              >
                {showAttendanceForm ? "Cancel" : "Add Attendance"}
              </button>
            </div>
            {showAttendanceForm && (
              <form onSubmit={handleAttendanceSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Date (Gregorian)</span>
                    <input
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Present</span>
                    <select
                      value={attendanceForm.present.toString()}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, present: e.target.value === "true" })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Has Permission</span>
                    <select
                      value={attendanceForm.hasPermission.toString()}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, hasPermission: e.target.value === "true" })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Reason (if absent)</span>
                    <input
                      type="text"
                      value={attendanceForm.reason}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, reason: e.target.value })}
                      className="p-3 border rounded-lg"
                      disabled={!attendanceForm.hasPermission}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Marked By</span>
                    <input
                      type="text"
                      value={attendanceForm.markedBy}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, markedBy: e.target.value })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    />
                  </label>
                </div>
                {formError && <div className="text-red-500 text-sm mt-2">{formError}</div>}
                <button
                  type="submit"
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  aria-label="Submit attendance record"
                >
                  Submit
                </button>
              </form>
            )}
            {attendance.length === 0 ? (
              <div className="text-gray-600">No attendance records available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-3 text-left">Ethiopian Date</th>
                      <th className="border p-3 text-left">Present</th>
                      <th className="border p-3 text-left">Has Permission</th>
                      <th className="border p-3 text-left">Reason</th>
                      <th className="border p-3 text-left">Marked By</th>
                      <th className="border p-3 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => {
                      const ethiopianDate = gregorianToEthiopianDate(new Date(record.date));
                      const isSundayRecord = sundays.includes(ethiopianDate);
                      return (
                        <tr key={`${record.studentId}-${record.date}`} className={isSundayRecord ? "bg-yellow-100" : "hover:bg-gray-50"}>
                          <td className="border p-3">{ethiopianDate}</td>
                          <td className="border p-3">{record.present ? "Yes" : "No"}</td>
                          <td className="border p-3">{record.hasPermission ? "Yes" : "No"}</td>
                          <td className="border p-3">{record.reason || "-"}</td>
                          <td className="border p-3">{record.markedBy || "-"}</td>
                          <td className="border p-3">{record.timestamp || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Sundays in {student?.Academic_Year || "N/A"}:</h3>
              <ul className="list-disc pl-5">
                {sundays.map((sunday) => {
                  const hasAttendance = attendance.some((rec) => gregorianToEthiopianDate(new Date(rec.date)) === sunday);
                  return (
                    <li key={sunday} className={hasAttendance ? "text-green-600" : "text-red-600"}>
                      {sunday} {hasAttendance ? "(Attended)" : "(Absent)"}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      case "Payment Status":
        return (
          <div>
            <div className="flex justify-end mb-4">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                aria-label={showPaymentForm ? "Close payment form" : "Add payment record"}
              >
                {showPaymentForm ? "Cancel" : "Add Payment"}
              </button>
            </div>
            {showPaymentForm && (
              <form onSubmit={handlePaymentSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Date</span>
                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Amount</span>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Status</span>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as "Paid" | "Pending" | "Overdue" })}
                      className="p-3 border rounded-lg"
                      required
                      aria-required="true"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm font-medium">Description</span>
                    <input
                      type="text"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      className="p-3 border rounded-lg"
                    />
                  </label>
                </div>
                {formError && <div className="text-red-500 text-sm mt-2">{formError}</div>}
                <button
                  type="submit"
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  aria-label="Submit payment record"
                >
                  Submit
                </button>
              </form>
            )}
            {payments.length === 0 ? (
              <div className="text-gray-600">No payment records available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-3 text-left">Date</th>
                      <th className="border p-3 text-left">Amount</th>
                      <th className="border p-3 text-left">Status</th>
                      <th className="border p-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={`${payment.studentId}-${payment.date}`} className="hover:bg-gray-50">
                        <td className="border p-3">{payment.date}</td>
                        <td className="border p-3">${payment.amount.toFixed(2)}</td>
                        <td className="border p-3">{payment.status}</td>
                        <td className="border p-3">{payment.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!student) return <div className="p-8">Student not found</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-extrabold text-blue-900 mb-6">Student Details</h1>
      <h2 className="text-2xl font-semibold mb-4">{`${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name}${student.Christian_Name ? ` (${student.Christian_Name})` : ""}`}</h2>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex border-b mb-4">
          {["Details", "Attendance", "Payment Status"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab(tab as "Details" | "Attendance" | "Payment Status")}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab}
            </button>
          ))}
        </div>
        <div>{renderTabContent()}</div>
      </div>
    </div>
  );
}