//src/lib/aggregateAttendance.ts

import { getDb } from "@/lib/mongodb";
import { formatEthiopianDate } from "@/lib/utils";
import { Document, WithId } from "mongodb";

// Define AttendanceRecord interface for type safety
interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
  hasPermission: boolean;
  reason: string;
  markedBy: string;
  timestamp: string;
  submissionId?: string;
}

// Priority: Present > Permission > Absent
function resolveStatus(records: AttendanceRecord[]): AttendanceRecord {
  const statusPriority = (record: AttendanceRecord): number => {
    if (record.present) return 2;
    if (record.hasPermission) return 1;
    return 0; // Absent
  };

  const sortedRecords = records.sort((a, b) => {
    const priorityDiff = statusPriority(b) - statusPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const topRecord = sortedRecords[0];
  return {
    studentId: topRecord.studentId,
    date: topRecord.date,
    present: topRecord.present,
    hasPermission: topRecord.hasPermission,
    reason: topRecord.reason,
    markedBy: topRecord.markedBy,
    timestamp: topRecord.timestamp,
  };
}

export async function aggregateAttendance(date: string) {
  try {
    const db = await getDb();

    // Find all temporary records for the given date
    const tempRecords = await db.collection<AttendanceRecord>("temp_attendance").find({ date }).toArray();

    if (tempRecords.length === 0) {
      console.log(`No temporary attendance records for ${date}`);
      return { insertedCount: 0, updatedCount: 0 };
    }

    // Group records by studentId
    const groupedByStudent: { [key: string]: AttendanceRecord[] } = tempRecords.reduce((acc, record) => {
      acc[record.studentId] = acc[record.studentId] || [];
      acc[record.studentId].push(record);
      return acc;
    }, {} as { [key: string]: AttendanceRecord[] });

    const aggregatedRecords: AttendanceRecord[] = [];
    for (const studentId in groupedByStudent) {
      const records = groupedByStudent[studentId];
      const resolvedRecord = resolveStatus(records);
      aggregatedRecords.push(resolvedRecord);
    }

    // Insert or update all records in ONE bulk round-trip (scales to any
    // student count; the previous loop did one findOneAndUpdate per student).
    const bulkResult = await db
      .collection<AttendanceRecord>("attendance")
      .bulkWrite(
        aggregatedRecords.map((record) => ({
          updateOne: {
            filter: { studentId: record.studentId, date: record.date },
            update: {
              $set: {
                present: record.present,
                hasPermission: record.hasPermission,
                reason: record.reason,
                markedBy: record.markedBy,
                timestamp: record.timestamp,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );

    const insertedCount = bulkResult.upsertedCount;
    const updatedCount = bulkResult.modifiedCount;

    // Clean up temporary records
    await db.collection("temp_attendance").deleteMany({ date });

    return {
      insertedCount,
      updatedCount,
    };
  } catch (error) {
    console.error("Attendance aggregation error:", error);
    throw error;
  }
}