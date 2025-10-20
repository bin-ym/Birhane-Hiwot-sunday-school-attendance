// src/app/admin/student-requests/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface StudentRequest {
  _id: string;
  studentData: {
    First_Name: string;
    Father_Name: string;
    Grandfather_Name: string;
    Mothers_Name: string;
    Grade: string;
    Sex: string;
    Age: string;
    Phone_Number: string;
    Address: string;
    DOB_Date: string;
    DOB_Month: string;
    DOB_Year: string;
  };
  requestedBy: string;
  status: string;
  rejectionReason?: string;
}

export default function StudentRequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<StudentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/student-requests/${id}`);
        if (!res.ok) throw new Error("Failed to fetch student request");
        const data = await res.json();
        setRequest(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load request");
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    if (!request) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/student-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request._id,
          status: "approved",
          approvedBy: "Admin",
        }),
      });
      if (!res.ok) throw new Error("Failed to approve request");
      toast.success("Student approved and added successfully!");
      router.push("/admin/student-requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/student-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request._id,
          status: "rejected",
          rejectionReason,
        }),
      });
      if (!res.ok) throw new Error("Failed to reject request");
      toast.success("Request rejected");
      router.push("/admin/student-requests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading details...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-red-600">
        <p>Error: {error}</p>
        <Button onClick={() => router.push("/admin/student-requests")} className="mt-4">
          Back to Requests
        </Button>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-blue-900 mb-6">
          Student Request Details
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Detail label="First Name" value={request.studentData.First_Name} />
          <Detail label="Father Name" value={request.studentData.Father_Name} />
          <Detail label="Grandfather Name" value={request.studentData.Grandfather_Name} />
          <Detail label="Mother Name" value={request.studentData.Mothers_Name} />
          <Detail label="Grade" value={request.studentData.Grade} />
          <Detail label="Sex" value={request.studentData.Sex} />
          <Detail label="Age" value={request.studentData.Age} />
          <Detail label="Phone" value={request.studentData.Phone_Number} />
          <Detail label="Address" value={request.studentData.Address} />
          <Detail label="Requested By" value={request.requestedBy} />
          <Detail label="DOB" value={`${request.studentData.DOB_Date}/${request.studentData.DOB_Month}/${request.studentData.DOB_Year}`} />
        </div>

        {request.status === "rejected" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-700">Rejection Reason:</p>
            <p className="text-red-600">{request.rejectionReason}</p>
          </div>
        )}

        {request.status === "pending" && (
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700">
              Rejection Reason (if rejecting)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full border rounded-lg p-2"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/admin/student-requests")}
            className="bg-gray-400 hover:bg-gray-500 text-white flex-1"
          >
            Back
          </Button>
          {request.status === "pending" && (
            <>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                Approve
              </Button>
              <Button
                onClick={handleReject}
                disabled={processing}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}