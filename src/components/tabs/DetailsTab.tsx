// src/components/tabs/DetailsTab.tsx
import { Student } from "@/lib/models";

interface DetailsTabProps {
  student: Student;
}

export default function DetailsTab({ student }: DetailsTabProps) {
  const fullName =
    `${student.First_Name} ${student.Father_Name} ${student.Grandfather_Name}`.trim();
  const christianName = student.Christian_Name
    ? ` (${student.Christian_Name})`
    : "";

  // Combine Date of Birth and Age
  const dobAndAge =
    student.DOB_Date && student.DOB_Month && student.DOB_Year
      ? `${student.DOB_Date}/${student.DOB_Month}/${student.DOB_Year} (${student.Age})`
      : null;

  return (
    <div className="mb-6">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-lg">
        <thead className="bg-gray-300 text-gray-800 uppercase text-sm leading-normal">
          <tr>
            <th className="border p-4 text-left">Field</th>
            <th className="border p-4 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {student.Unique_ID && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">ID Number</td>
              <td className="border p-4">{student.Unique_ID}</td>
            </tr>
          )}
          {fullName && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Name</td>
              <td className="border p-4">
                {fullName}
                {christianName}
              </td>
            </tr>
          )}
          {dobAndAge && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Date of Birth & Age</td>
              <td className="border p-4">{dobAndAge}</td>
            </tr>
          )}
          {student.Sex && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Sex</td>
              <td className="border p-4">{student.Sex}</td>
            </tr>
          )}
          {student.Phone_Number && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Phone Number</td>
              <td className="border p-4">{student.Phone_Number}</td>
            </tr>
          )}
          {student.Grade && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Grade (Sunday School)</td>
              <td className="border p-4">{student.Grade}</td>
            </tr>
          )}
          {student.Occupation && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Occupation</td>
              <td className="border p-4">{student.Occupation}</td>
            </tr>
          )}
          {student.Class && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Class (World School)</td>
              <td className="border p-4">{student.Class}</td>
            </tr>
          )}
          {student.School || student.School_Other ? (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">School</td>
              <td className="border p-4">
                {student.School || student.School_Other}
              </td>
            </tr>
          ) : null}
          {student.Educational_Background && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Educational Background</td>
              <td className="border p-4">{student.Educational_Background}</td>
            </tr>
          )}
          {student.Address || student.Address_Other ? (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Address</td>
              <td className="border p-4">
                {student.Address || student.Address_Other}
              </td>
            </tr>
          ) : null}
          {student.Academic_Year && (
            <tr className="hover:bg-gray-100 transition duration-150 ease-in-out">
              <td className="border p-4 font-medium">Academic Year</td>
              <td className="border p-4">{student.Academic_Year}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
