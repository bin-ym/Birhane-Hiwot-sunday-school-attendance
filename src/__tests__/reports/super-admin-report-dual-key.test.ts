/**
 * @jest-environment node
 */
import { ObjectId, Db } from "mongodb";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/reports/super-admin/route";
import { requireRole } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/mongodb";
import { getCurrentEthiopianYear } from "@/lib/utils";

jest.mock("@/lib/apiAuth", () => ({
  requireRole: jest.fn(),
  sanitizeError: jest.fn((err: any) => err?.message || String(err)),
}));

jest.mock("@/lib/rateLimit", () => ({
  enforceRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/mongodb", () => ({
  getDb: jest.fn(),
}));

describe("Phase 3 — Super Admin Report Dual-Key Resolution", () => {
  const ecYear = getCurrentEthiopianYear();
  const student1Id = new ObjectId();
  const student2Id = new ObjectId();
  const student3Id = new ObjectId();

  const mockStudents = [
    {
      _id: student1Id,
      Unique_ID: "ብሕ/18/01/001",
      First_Name: "አበበ",
      Father_Name: "ከበደ",
      Grandfather_Name: "ተሾመ",
      Grade: "1",
      Academic_Year: `${ecYear}`,
      Classification: "Regular",
      Sex: "Male",
      Age: 8,
      Phone_Number: "0911000001",
    },
    {
      _id: student2Id,
      Unique_ID: "ብሕ/18/02/002",
      First_Name: "አስቴር",
      Father_Name: "ተስፋዬ",
      Grandfather_Name: "ኃይሌ",
      Grade: "2",
      Academic_Year: `${ecYear}`,
      Classification: "Regular",
      Sex: "Female",
      Age: 9,
      Phone_Number: "0911000002",
    },
    {
      _id: student3Id,
      Unique_ID: "ብሕ/18/03/003",
      First_Name: "ዳዊት",
      Father_Name: "ግርማ",
      Grandfather_Name: "ዘውዴ",
      Grade: "3",
      Academic_Year: `${ecYear}`,
      Classification: "Regular",
      Sex: "Male",
      Age: 10,
      Phone_Number: "0911000003",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ error: null });
    (enforceRateLimit as jest.Mock).mockResolvedValue(null);
  });

  const setupMockDb = ({
    students = mockStudents,
    attendance = [] as any[],
    payments = [] as any[],
    results = [] as any[],
    users = [] as any[],
  } = {}) => {
    const mockDb = {
      collection: jest.fn().mockImplementation((colName: string) => {
        if (colName === "students") {
          return {
            find: jest.fn().mockImplementation((query: any) => ({
              toArray: jest.fn().mockResolvedValue(
                query?.$or
                  ? students.filter((s) => {
                      const idCond = query.$or.find((c: any) => c._id)?._id?.$in;
                      const uidCond = query.$or.find((c: any) => c.Unique_ID)?._id?.$in || query.$or.find((c: any) => c.Unique_ID)?.Unique_ID?.$in;
                      if (idCond && idCond.some((id: ObjectId) => id.equals(s._id))) return true;
                      if (uidCond && uidCond.includes(s.Unique_ID)) return true;
                      return false;
                    })
                  : students,
              ),
            })),
            countDocuments: jest.fn().mockResolvedValue(students.length),
          };
        }
        if (colName === "attendance") {
          return {
            find: jest.fn().mockReturnValue({
              project: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue(attendance),
              }),
            }),
          };
        }
        if (colName === "payment_status") {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(payments),
            }),
          };
        }
        if (colName === "student_results") {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(results),
            }),
          };
        }
        if (colName === "users") {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(users),
            }),
          };
        }
        return {
          find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
          countDocuments: jest.fn().mockResolvedValue(0),
        };
      }),
    } as unknown as Db;

    (getDb as jest.Mock).mockResolvedValue(mockDb);
    return mockDb;
  };

  it("1. resolves attendance records referencing students by MongoDB ObjectId", async () => {
    setupMockDb({
      attendance: [
        {
          studentId: student1Id.toHexString(), // Hex ObjectId
          date: "2018-01-10",
          present: false,
          Grade: "1",
        },
        {
          studentId: student1Id.toHexString(),
          date: "2018-01-17",
          present: false,
          Grade: "1",
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const frequent = data.attendanceAnalytics.frequentAbsences;
    expect(frequent).toHaveLength(1);
    expect(frequent[0].studentId).toBe(student1Id.toHexString());
    expect(frequent[0].uniqueId).toBe("ብሕ/18/01/001");
    expect(frequent[0].name).toBe("አበበ ከበደ");
    expect(frequent[0].absentCount).toBe(2);
  });

  it("2. resolves attendance records referencing students by school-facing Unique_ID", async () => {
    setupMockDb({
      attendance: [
        {
          studentId: "ብሕ/18/02/002", // School-facing Unique_ID
          date: "2018-01-10",
          present: false,
          Grade: "2",
        },
        {
          studentId: "ብሕ/18/02/002",
          date: "2018-01-17",
          present: false,
          Grade: "2",
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const frequent = data.attendanceAnalytics.frequentAbsences;
    expect(frequent).toHaveLength(1);
    // Canonical studentId is the student's _id.toString()
    expect(frequent[0].studentId).toBe(student2Id.toHexString());
    expect(frequent[0].uniqueId).toBe("ብሕ/18/02/002");
    expect(frequent[0].name).toBe("አስቴር ተስፋዬ");
    expect(frequent[0].absentCount).toBe(2);
  });

  it("3. prevents duplicate counting when records use mixed identifiers (ObjectId AND Unique_ID) for the same student", async () => {
    setupMockDb({
      attendance: [
        // 2 absences recorded with ObjectId
        {
          studentId: student3Id.toHexString(),
          date: "2018-01-05",
          present: false,
          Grade: "3",
        },
        {
          studentId: student3Id.toHexString(),
          date: "2018-01-12",
          present: false,
          Grade: "3",
        },
        // 2 absences recorded with Unique_ID
        {
          studentId: "ብሕ/18/03/003",
          date: "2018-01-19",
          present: false,
          Grade: "3",
        },
        {
          studentId: "ብሕ/18/03/003",
          date: "2018-01-26",
          present: false,
          Grade: "3",
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const frequent = data.attendanceAnalytics.frequentAbsences;

    // Must be unified into EXACTLY ONE entry, NOT two split entries
    expect(frequent).toHaveLength(1);
    expect(frequent[0].studentId).toBe(student3Id.toHexString());
    expect(frequent[0].uniqueId).toBe("ብሕ/18/03/003");
    expect(frequent[0].name).toBe("ዳዊት ግርማ");
    // Combined absences: 2 + 2 = 4
    expect(frequent[0].absentCount).toBe(4);
    expect(frequent[0].isHighRisk).toBe(true); // >= 3 absences
  });

  it("4. handles unresolved student references safely without exposing sensitive data", async () => {
    setupMockDb({
      attendance: [
        {
          studentId: "UNKNOWN-999-SECRET-TOKEN",
          date: "2018-02-01",
          present: false,
          Grade: "1",
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const frequent = data.attendanceAnalytics.frequentAbsences;
    expect(frequent).toHaveLength(1);
    expect(frequent[0].studentId).toBe("unresolved");
    expect(frequent[0].uniqueId).toBe("—");
    expect(frequent[0].name).toBe("Unknown Student");
    expect(frequent[0].absentCount).toBe(1);
  });

  it("5. resolves dual-key student references in payment status", async () => {
    setupMockDb({
      payments: [
        {
          studentId: "ብሕ/18/01/001", // Payment recorded with Unique_ID
          academicYear: `${ecYear}`,
          data: {
            Meskerem: "Paid",
            Tikimt: "Paid",
            Hidar: "Paid",
            Tahsas: "Unpaid",
          },
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const paymentList = data.paymentAnalytics.studentsPaymentList;
    const student1Payment = paymentList.find((p: any) => p.studentId === student1Id.toHexString());

    expect(student1Payment).toBeDefined();
    expect(student1Payment.paidMonthsCount).toBe(3);
    expect(student1Payment.overallStatus).toBe("Partial");
  });

  it("6. resolves dual-key student references in student results", async () => {
    setupMockDb({
      results: [
        {
          _id: new ObjectId(),
          studentId: "ብሕ/18/02/002", // Result recorded with Unique_ID
          subjectName: "Spiritual History",
          totalScore: 92,
          grade: "A+",
          academicYear: `${ecYear}`,
        },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const performers = data.performanceAnalytics.topPerformers;
    expect(performers).toHaveLength(1);
    expect(performers[0].studentId).toBe(student2Id.toHexString());
    expect(performers[0].studentName).toBe("አስቴር ተስፋዬ");
    expect(performers[0].grade).toBe("2");
    expect(performers[0].totalScore).toBe(92);
  });

  it("7. enforces RBAC: rejects requests when not Super Admin", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Forbidden: Super Admin required" }), {
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
      }),
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("8. preserves demographic filter accuracy across grades and gender", async () => {
    setupMockDb({
      attendance: [
        { studentId: student1Id.toHexString(), present: true, Grade: "1" },
        { studentId: student2Id.toHexString(), present: false, Grade: "2" },
      ],
    });

    const req = new NextRequest("http://localhost:3000/api/reports/super-admin");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.totalStudentsFiltered).toBe(3);
    expect(data.demographics.gender.male).toBe(2);
    expect(data.demographics.gender.female).toBe(1);
    expect(data.summary.attendanceStats.totalRecords).toBe(2);
    expect(data.summary.attendanceStats.presentCount).toBe(1);
    expect(data.summary.attendanceStats.absentCount).toBe(1);
  });
});
