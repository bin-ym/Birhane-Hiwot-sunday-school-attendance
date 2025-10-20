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

    // Insert or update in permanent attendance collection
    const insertedRecords: AttendanceRecord[] = [];
    const updatedRecords: AttendanceRecord[] = [];

    for (const record of aggregatedRecords) {
      // Use any for the driver result since the generic type can vary by driver version
      const result: any = await db.collection<AttendanceRecord>("attendance").findOneAndUpdate(
        { studentId: record.studentId, date: record.date },
        {
          $set: {
            present: record.present,
            hasPermission: record.hasPermission,
            reason: record.reason,
            markedBy: record.markedBy,
            timestamp: record.timestamp,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

      // Safely check if it was an insert or update
      const updatedExisting = result?.lastErrorObject?.updatedExisting;
      if (result?.value) {
        if (updatedExisting) {
          updatedRecords.push(result.value);
        } else {
          insertedRecords.push(result.value);
        }
      }
    }

    // Clean up temporary records
    await db.collection("temp_attendance").deleteMany({ date });

    return {
      insertedCount: insertedRecords.length,
      updatedCount: updatedRecords.length,
    };
  } catch (error) {
    console.error("Attendance aggregation error:", error);
    throw error;
  }
}