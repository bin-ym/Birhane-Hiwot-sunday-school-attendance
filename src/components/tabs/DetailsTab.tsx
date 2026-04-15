// src/components/tabs/DetailsTab.tsx
"use client";

import { Student } from "@/lib/models";
import { useState } from "react";

interface DetailsTabProps {
  student: Student;
}

export default function DetailsTab({ student }: DetailsTabProps) {
  const [generating, setGenerating] = useState(false);
  const [localQR, setLocalQR] = useState(student.qr_code);

  const fullName =
    `${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name}`.trim();
  const christianName = student.Christian_Name
    ? ` (${student.Christian_Name})`
    : "";

  const dobAndAge =
    student.DOB_Date && student.DOB_Month && student.DOB_Year
      ? `${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year} (Age: ${student.Age})`
      : null;

  const handleGenerateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateQR: true }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLocalQR(updated.qr_code);
      } else {
        alert("Failed to generate QR code");
      }
    } catch (error) {
      alert("Error generating QR code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left Sidebar - Photo, Name, ID, QR */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
          {/* Photo Section */}
          <div className="flex flex-col items-center mb-6">
            {student.photo_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photo_data_url}
                alt="Student Photo"
                className="w-48 h-48 object-cover rounded-lg border-4 border-gray-200 shadow-md"
              />
            ) : (
              <div className="w-48 h-48 border-4 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-gray-500">No Photo</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {fullName}
              {christianName && <span className="text-gray-600 text-base">{christianName}</span>}
            </h2>
          </div>

          {/* ID Number */}
          <div className="bg-blue-50 rounded-lg p-3 mb-6 text-center">
            <p className="text-xs text-gray-600 mb-1">ID Number</p>
            <p className="text-lg font-bold text-blue-700">{student.Unique_ID}</p>
          </div>

          {/* QR Code Section */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">QR Code</h3>
            {localQR && student._id ? (
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/students/${student._id}/qr`}
                  alt="Student QR Code"
                  className="w-40 h-40 border-2 border-gray-300 rounded-lg shadow-md mb-3"
                />
                <a
                  href={`/api/students/${student._id}/qr`}
                  download={`${student.Unique_ID}_QR.png`}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm text-center hover:bg-blue-700 transition"
                >
                  Download QR
                </a>
              </div>
            ) : (
              <button
                onClick={handleGenerateQR}
                disabled={generating}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm hover:bg-green-700 transition disabled:bg-gray-400"
              >
                {generating ? "Generating..." : "Generate QR Code"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Content - Student Details */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Student Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Personal Details</h4>
              
              {dobAndAge && (
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-base font-medium text-gray-800">{dobAndAge}</p>
                </div>
              )}

              {student.Sex && (
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="text-base font-medium text-gray-800">{student.Sex}</p>
                </div>
              )}

              {student.Phone_Number && (
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-base font-medium text-gray-800">{student.Phone_Number}</p>
                </div>
              )}

              {student.Mothers_Name && (
                <div>
                  <p className="text-sm text-gray-600">Mother&apos;s Name</p>
                  <p className="text-base font-medium text-gray-800">{student.Mothers_Name}</p>
                </div>
              )}

              {(student.Address || student.Address_Other) && (
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-base font-medium text-gray-800">
                    {student.Address || student.Address_Other}
                  </p>
                </div>
              )}
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Academic Details</h4>
              
              {student.Grade && (
                <div>
                  <p className="text-sm text-gray-600">Grade (Sunday School)</p>
                  <p className="text-base font-medium text-gray-800">{student.Grade}</p>
                </div>
              )}

              {student.Academic_Year && (
                <div>
                  <p className="text-sm text-gray-600">Academic Year</p>
                  <p className="text-base font-medium text-gray-800">{student.Academic_Year}</p>
                </div>
              )}

              {student.Class && (
                <div>
                  <p className="text-sm text-gray-600">Class (World School)</p>
                  <p className="text-base font-medium text-gray-800">{student.Class}</p>
                </div>
              )}

              {(student.School || student.School_Other) && (
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="text-base font-medium text-gray-800">
                    {student.School || student.School_Other}
                  </p>
                </div>
              )}

              {student.Educational_Background && (
                <div>
                  <p className="text-sm text-gray-600">Educational Background</p>
                  <p className="text-base font-medium text-gray-800">{student.Educational_Background}</p>
                </div>
              )}

              {student.Occupation && (
                <div>
                  <p className="text-sm text-gray-600">Occupation</p>
                  <p className="text-base font-medium text-gray-800">{student.Occupation}</p>
                </div>
              )}

              {student.Place_of_Work && (
                <div>
                  <p className="text-sm text-gray-600">Place of Work</p>
                  <p className="text-base font-medium text-gray-800">{student.Place_of_Work}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
