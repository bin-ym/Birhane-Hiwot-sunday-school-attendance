// src/app/admin/student-requests/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { StudentRequest } from "@/lib/models";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function StudentRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student-requests?status=pending");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch("/api/student-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          status: "approved",
          approvedBy: "Admin",
        }),
      });

      if (!res.ok) throw new Error("Failed to approve request");
      toast.success("Request approved and student added");
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessingId(requestId);
    try {
      const res = await fetch("/api/student-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          status: "rejected",
          rejectionReason,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject request");
      toast.success("Request rejected");
      setSelectedRequest(null);
      setRejectionReason("");
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-6">
          Student Registration Requests
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="p-8 bg-white rounded-lg border text-center text-gray-500">
            No pending requests
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div
                key={request._id?.toString()}
                className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Student Name</p>
                    <p className="font-semibold">
                      {request.studentData.First_Name}{" "}
                      {request.studentData.Father_Name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Grade</p>
                    <p className="font-semibold">{request.studentData.Grade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sex</p>
                    <p className="font-semibold">{request.studentData.Sex}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested By</p>
                    <p className="font-semibold">{request.requestedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">DOB</p>
                    <p className="font-semibold">
                      {request.studentData.DOB_Date}/
                      {request.studentData.DOB_Month}/
                      {request.studentData.DOB_Year}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-semibold">{request.studentData.Age}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      router.push(`/admin/student-requests/${request._id}`)
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    View Details
                  </Button>

                  <Button
                    onClick={() => handleApprove(request._id!.toString())}
                    disabled={processingId === request._id?.toString()}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingId === request._id?.toString()
                      ? "Processing..."
                      : "Approve"}
                  </Button>
                  <Button
                    onClick={() => setSelectedRequest(request)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-4">
                Student Request Details
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">First Name</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.First_Name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Father Name</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Father_Name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grandfather Name</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Grandfather_Name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mother Name</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Mothers_Name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grade</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Grade}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sex</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Sex}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Age}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Phone_Number}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-semibold">
                    {selectedRequest.studentData.Address}
                  </p>
                </div>
              </div>

              {selectedRequest.status === "rejected" && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700 font-semibold">
                    Rejection Reason:
                  </p>
                  <p className="text-red-600">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="mb-4">
                  <label className="block mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Rejection Reason (if rejecting)
                    </span>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full mt-1 p-2 border rounded-lg"
                      rows={3}
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Close
                </Button>
                {selectedRequest.status === "pending" && (
                  <>
                    <Button
                      onClick={() =>
                        handleApprove(selectedRequest._id!.toString())
                      }
                      disabled={
                        processingId === selectedRequest._id?.toString()
                      }
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() =>
                        handleReject(selectedRequest._id!.toString())
                      }
                      disabled={
                        processingId === selectedRequest._id?.toString()
                      }
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
