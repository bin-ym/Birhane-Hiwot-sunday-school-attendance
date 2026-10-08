// src/app/api/reports/super-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireRole, sanitizeError } from "@/lib/apiAuth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";
import { GRADE_OPTIONS } from "@/lib/constants";
import { getCurrentEthiopianYear, academicYearMatchesEthiopian } from "@/lib/utils";

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req.headers.get("origin"));
  
  // 1. Authorize Super Admin only
  const { error } = await requireRole(req, "Super Admin");
  if (error) {
    Object.entries(cors).forEach(([k, v]) => error.headers.set(k, v));
    return error;
  }

  // 2. Rate limit
  const rl = await enforceRateLimit(req, { maxRequests: 60, windowMs: 60_000 });
  if (rl) {
    Object.entries(cors).forEach(([k, v]) => rl.headers.set(k, v));
    return rl;
  }

  try {
    const db = await getDb();
    const url = new URL(req.url);
    const academicYear = url.searchParams.get("academicYear") || "";
    const grade = url.searchParams.get("grade") || "";
    const classification = url.searchParams.get("classification") || "";
    const dateFrom = url.searchParams.get("dateFrom") || "";
    const dateTo = url.searchParams.get("dateTo") || "";

    const ecYear = getCurrentEthiopianYear();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. STUDENTS COLLECTION
    // ─────────────────────────────────────────────────────────────────────────
    const studentQuery: Record<string, unknown> = {};
    if (academicYear) {
      studentQuery.Academic_Year = { $regex: `^${academicYear}(?:\\s|$)` };
    }
    if (grade) {
      studentQuery.Grade = grade;
    }
    if (classification) {
      studentQuery.Classification = classification;
    }

    const [allStudents, allStudentsCount, currentYearStudentsCount] = await Promise.all([
      db.collection("students")
        .find(studentQuery, {
          projection: {
            _id: 1,
            Unique_ID: 1,
            First_Name: 1,
            Father_Name: 1,
            Grandfather_Name: 1,
            Grade: 1,
            Academic_Year: 1,
            Classification: 1,
            Sex: 1,
            Age: 1,
            Phone_Number: 1,
          },
        })
        .toArray(),
      db.collection("students").countDocuments(),
      db.collection("students").countDocuments({
        Academic_Year: { $regex: `^${ecYear}(?:\\s|$)` },
      }),
    ]);

    const studentIdToStudentMap = new Map<string, typeof allStudents[0]>();
    for (const s of allStudents) {
      studentIdToStudentMap.set(s._id.toString(), s);
    }

    // Demographics: Grade distribution
    const gradeOrderMap = new Map<string, number>();
    GRADE_OPTIONS.forEach((opt, idx) => gradeOrderMap.set(opt.value, idx));

    const gradeCountsMap = new Map<string, { count: number; maleCount: number; femaleCount: number }>();
    GRADE_OPTIONS.forEach((opt) => {
      gradeCountsMap.set(opt.value, { count: 0, maleCount: 0, femaleCount: 0 });
    });

    // Demographics: Academic Year distribution
    const yearCountsMap = new Map<string, number>();

    // Demographics: Classification distribution
    const classificationCountsMap = new Map<string, number>();

    // Demographics: Gender breakdown
    let totalMales = 0;
    let totalFemales = 0;

    for (const st of allStudents) {
      const g = st.Grade || "Unassigned";
      const existingGrade = gradeCountsMap.get(g) || { count: 0, maleCount: 0, femaleCount: 0 };
      existingGrade.count += 1;
      const sexLower = String(st.Sex || "").toLowerCase();
      if (sexLower.startsWith("m") || sexLower === "ወንድ") {
        existingGrade.maleCount += 1;
        totalMales += 1;
      } else if (sexLower.startsWith("f") || sexLower === "ሴት") {
        existingGrade.femaleCount += 1;
        totalFemales += 1;
      }
      gradeCountsMap.set(g, existingGrade);

      // Year match (extract 4-digit Ethiopian year)
      const yrMatch = String(st.Academic_Year || "").match(/\d{4}/)?.[0] || String(st.Academic_Year || "Unknown");
      yearCountsMap.set(yrMatch, (yearCountsMap.get(yrMatch) || 0) + 1);

      // Classification
      const cl = st.Classification || "Regular";
      classificationCountsMap.set(cl, (classificationCountsMap.get(cl) || 0) + 1);
    }

    const studentsByGrade = Array.from(gradeCountsMap.entries())
      .filter(([gradeName, data]) => {
        // If a specific grade is filtered, only return that grade, otherwise return grades with count or core options
        if (grade && gradeName !== grade) return false;
        return data.count > 0 || gradeOrderMap.has(gradeName);
      })
      .sort((a, b) => {
        const orderA = gradeOrderMap.get(a[0]) ?? 999;
        const orderB = gradeOrderMap.get(b[0]) ?? 999;
        return orderA - orderB;
      })
      .map(([gradeName, data]) => ({
        grade: gradeName,
        count: data.count,
        maleCount: data.maleCount,
        femaleCount: data.femaleCount,
        percentage: allStudents.length > 0 ? Math.round((data.count / allStudents.length) * 100) : 0,
      }));

    const studentsByYear = Array.from(yearCountsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, count]) => ({
        academicYear: year,
        count,
        percentage: allStudents.length > 0 ? Math.round((count / allStudents.length) * 100) : 0,
      }));

    const studentsByClassification = Array.from(classificationCountsMap.entries())
      .map(([cls, count]) => ({
        classification: cls,
        count,
        percentage: allStudents.length > 0 ? Math.round((count / allStudents.length) * 100) : 0,
      }));

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ATTENDANCE COLLECTION & FREQUENT ABSENCES
    // ─────────────────────────────────────────────────────────────────────────
    const attendanceQuery: Record<string, unknown> = {};
    if (grade) {
      attendanceQuery.Grade = grade;
    }

    // Pull attendance records
    const attendanceDocs = await db.collection("attendance")
      .find(attendanceQuery)
      .project({
        studentId: 1,
        date: 1,
        present: 1,
        hasPermission: 1,
        reason: 1,
        markedBy: 1,
        Grade: 1,
      })
      .toArray();

    // Filter by date range in memory if supplied
    let filteredAttendance = attendanceDocs;
    if (dateFrom) {
      const from = new Date(dateFrom);
      filteredAttendance = filteredAttendance.filter((a) => new Date(a.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filteredAttendance = filteredAttendance.filter((a) => new Date(a.date) <= to);
    }

    const totalAttendanceRecords = filteredAttendance.length;
    let totalPresentMarks = 0;
    let totalAbsentMarks = 0;

    // Student ID -> attendance totals
    const studentAttendanceMap = new Map<string, { present: number; absent: number; lastDate: string }>();

    // Grade -> attendance totals
    const gradeAttendanceMap = new Map<string, { total: number; present: number; absent: number }>();
    GRADE_OPTIONS.forEach((opt) => {
      gradeAttendanceMap.set(opt.value, { total: 0, present: 0, absent: 0 });
    });

    // Facilitator email -> marked records count
    const facilitatorMarkedCountMap = new Map<string, number>();

    for (const record of filteredAttendance) {
      const isPresent = Boolean(record.present);
      if (isPresent) totalPresentMarks++;
      else totalAbsentMarks++;

      // Per-student attendance tracking
      const stId = String(record.studentId);
      const studentStat = studentAttendanceMap.get(stId) || { present: 0, absent: 0, lastDate: "" };
      if (isPresent) studentStat.present++;
      else studentStat.absent++;
      if (record.date) studentStat.lastDate = record.date;
      studentAttendanceMap.set(stId, studentStat);

      // Per-grade attendance tracking
      // Resolve grade from record.Grade or look up in student map
      let recordGrade = record.Grade;
      if (!recordGrade && studentIdToStudentMap.has(stId)) {
        recordGrade = studentIdToStudentMap.get(stId)?.Grade;
      }
      if (recordGrade) {
        const ga = gradeAttendanceMap.get(recordGrade) || { total: 0, present: 0, absent: 0 };
        ga.total++;
        if (isPresent) ga.present++;
        else ga.absent++;
        gradeAttendanceMap.set(recordGrade, ga);
      }

      // Marked by facilitator tracker
      if (record.markedBy) {
        const marker = String(record.markedBy).trim();
        facilitatorMarkedCountMap.set(marker, (facilitatorMarkedCountMap.get(marker) || 0) + 1);
      }
    }

    const overallAttendanceRate = totalAttendanceRecords > 0
      ? Math.round((totalPresentMarks / totalAttendanceRecords) * 100)
      : 0;

    const attendanceByGrade = Array.from(gradeAttendanceMap.entries())
      .filter(([gradeName, ga]) => {
        if (grade && gradeName !== grade) return false;
        return ga.total > 0 || gradeOrderMap.has(gradeName);
      })
      .sort((a, b) => {
        const orderA = gradeOrderMap.get(a[0]) ?? 999;
        const orderB = gradeOrderMap.get(b[0]) ?? 999;
        return orderA - orderB;
      })
      .map(([gradeName, ga]) => ({
        grade: gradeName,
        total: ga.total,
        present: ga.present,
        absent: ga.absent,
        rate: ga.total > 0 ? Math.round((ga.present / ga.total) * 100) : 0,
      }));

    // Frequent absences list: students with absences
    // We look up all students who have absent records, enriched with student details
    const frequentAbsences: Array<{
      studentId: string;
      uniqueId: string;
      name: string;
      grade: string;
      academicYear: string;
      absentCount: number;
      presentCount: number;
      totalRecorded: number;
      absentRate: number;
      isHighRisk: boolean;
      lastRecordedDate: string;
    }> = [];

    for (const [stId, stat] of studentAttendanceMap.entries()) {
      if (stat.absent <= 0) continue;
      const st = studentIdToStudentMap.get(stId);
      
      // If student was filtered out by grade or academic year, skip
      if (grade && st && st.Grade !== grade) continue;
      if (academicYear && st && !academicYearMatchesEthiopian(String(st.Academic_Year), parseInt(academicYear, 10))) continue;

      const totalRecorded = stat.present + stat.absent;
      frequentAbsences.push({
        studentId: stId,
        uniqueId: st?.Unique_ID || "—",
        name: st ? [st.First_Name, st.Father_Name].filter(Boolean).join(" ") : `Student (${stId.slice(-6)})`,
        grade: st?.Grade || "—",
        academicYear: String(st?.Academic_Year || "—"),
        absentCount: stat.absent,
        presentCount: stat.present,
        totalRecorded,
        absentRate: totalRecorded > 0 ? Math.round((stat.absent / totalRecorded) * 100) : 0,
        isHighRisk: stat.absent >= 3,
        lastRecordedDate: stat.lastDate || "—",
      });
    }

    // Sort frequent absences descending by absent count
    frequentAbsences.sort((a, b) => b.absentCount - a.absentCount || a.name.localeCompare(b.name));

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PAYMENT STATUS COLLECTION
    // ─────────────────────────────────────────────────────────────────────────
    const paymentQuery: Record<string, unknown> = {};
    const evalYear = academicYear || String(ecYear);
    paymentQuery.academicYear = evalYear;

    const paymentRecords = await db.collection("payment_status")
      .find(paymentQuery)
      .toArray();

    const paymentByStudentMap = new Map<string, typeof paymentRecords[0]>();
    for (const p of paymentRecords) {
      paymentByStudentMap.set(String(p.studentId), p);
    }

    let paidStudentsCount = 0;
    let unpaidStudentsCount = 0;
    let partialPaidStudentsCount = 0;

    const gradePaymentMap = new Map<string, { total: number; paid: number; unpaid: number }>();
    GRADE_OPTIONS.forEach((opt) => {
      gradePaymentMap.set(opt.value, { total: 0, paid: 0, unpaid: 0 });
    });

    const studentPaymentsList: Array<{
      studentId: string;
      uniqueId: string;
      name: string;
      grade: string;
      academicYear: string;
      paidMonthsCount: number;
      unpaidMonthsCount: number;
      overallStatus: "Paid" | "Unpaid" | "Partial";
      monthsSummary: string;
    }> = [];

    // Evaluate payment status for the students in scope
    for (const st of allStudents) {
      const stId = st._id.toString();
      const pRecord = paymentByStudentMap.get(stId);
      let paidCount = 0;
      let unpaidCount = 0;

      if (pRecord?.data && typeof pRecord.data === "object") {
        for (const [monthKey, val] of Object.entries(pRecord.data)) {
          if (monthKey === "Pagumē") continue; // Pagume omitted as per system rules
          const status = typeof val === "string" ? val : (val as any)?.status;
          if (status === "Paid") paidCount++;
          else unpaidCount++;
        }
      } else {
        unpaidCount = 12; // 12 standard months unpaid by default
      }

      let overallStatus: "Paid" | "Unpaid" | "Partial" = "Unpaid";
      if (paidCount > 0 && unpaidCount === 0) {
        overallStatus = "Paid";
        paidStudentsCount++;
      } else if (paidCount > 0) {
        overallStatus = "Partial";
        partialPaidStudentsCount++;
      } else {
        overallStatus = "Unpaid";
        unpaidStudentsCount++;
      }

      const stGrade = st.Grade || "Unassigned";
      const gp = gradePaymentMap.get(stGrade) || { total: 0, paid: 0, unpaid: 0 };
      gp.total++;
      if (overallStatus === "Paid") gp.paid++;
      else gp.unpaid++;
      gradePaymentMap.set(stGrade, gp);

      studentPaymentsList.push({
        studentId: stId,
        uniqueId: st.Unique_ID || "—",
        name: [st.First_Name, st.Father_Name].filter(Boolean).join(" "),
        grade: stGrade,
        academicYear: String(st.Academic_Year || evalYear),
        paidMonthsCount: paidCount,
        unpaidMonthsCount: unpaidCount,
        overallStatus,
        monthsSummary: `${paidCount} paid / ${paidCount + unpaidCount} months`,
      });
    }

    const totalStudentsInPaymentScope = allStudents.length;
    const paymentCollectionRate = totalStudentsInPaymentScope > 0
      ? Math.round(((paidStudentsCount + (partialPaidStudentsCount * 0.5)) / totalStudentsInPaymentScope) * 100)
      : 0;

    const paymentsByGrade = Array.from(gradePaymentMap.entries())
      .filter(([gradeName, gp]) => {
        if (grade && gradeName !== grade) return false;
        return gp.total > 0 || gradeOrderMap.has(gradeName);
      })
      .sort((a, b) => {
        const orderA = gradeOrderMap.get(a[0]) ?? 999;
        const orderB = gradeOrderMap.get(b[0]) ?? 999;
        return orderA - orderB;
      })
      .map(([gradeName, gp]) => ({
        grade: gradeName,
        total: gp.total,
        paid: gp.paid,
        unpaid: gp.unpaid,
        rate: gp.total > 0 ? Math.round((gp.paid / gp.total) * 100) : 0,
      }));

    // ─────────────────────────────────────────────────────────────────────────
    // 4. STUDENT RESULTS & ACADEMIC PERFORMANCE
    // ─────────────────────────────────────────────────────────────────────────
    const resultsQuery: Record<string, unknown> = {};
    if (academicYear) {
      resultsQuery.academicYear = academicYear;
    }

    const resultsDocs = await db.collection("student_results")
      .find(resultsQuery)
      .toArray();

    let totalScoreSum = 0;
    let passingResultsCount = 0;
    let failingResultsCount = 0;

    const gradeResultsMap = new Map<string, { count: number; totalScore: number; pass: number; fail: number }>();
    GRADE_OPTIONS.forEach((opt) => {
      gradeResultsMap.set(opt.value, { count: 0, totalScore: 0, pass: 0, fail: 0 });
    });

    const letterDistributionMap = new Map<string, number>([
      ["A+", 0],
      ["A", 0],
      ["A-", 0],
      ["B+", 0],
      ["B", 0],
      ["B-", 0],
      ["C+", 0],
      ["C", 0],
      ["C-", 0],
      ["D", 0],
      ["F", 0],
    ]);

    const topPerformers: Array<{
      studentId: string;
      studentName: string;
      grade: string;
      subjectName: string;
      totalScore: number;
      letterGrade: string;
    }> = [];

    const needsSupport: Array<{
      studentId: string;
      studentName: string;
      grade: string;
      subjectName: string;
      totalScore: number;
      letterGrade: string;
    }> = [];

    for (const res of resultsDocs) {
      // Find associated student to verify grade
      const st = studentIdToStudentMap.get(String(res.studentId));
      const resGrade = st?.Grade || res.grade || "Unassigned";

      if (grade && resGrade !== grade) continue;

      const score = Number(res.totalScore ?? 0);
      totalScoreSum += score;

      const isPass = score >= 50 && res.grade !== "F";
      if (isPass) passingResultsCount++;
      else failingResultsCount++;

      // Letter grade
      const letter = String(res.grade || (score >= 90 ? "A+" : score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F")).trim();
      letterDistributionMap.set(letter, (letterDistributionMap.get(letter) || 0) + 1);

      // Grade results breakdown
      const gr = gradeResultsMap.get(resGrade) || { count: 0, totalScore: 0, pass: 0, fail: 0 };
      gr.count++;
      gr.totalScore += score;
      if (isPass) gr.pass++;
      else gr.fail++;
      gradeResultsMap.set(resGrade, gr);

      const performerItem = {
        studentId: String(res.studentId),
        studentName: res.studentName || (st ? [st.First_Name, st.Father_Name].filter(Boolean).join(" ") : "Student"),
        grade: resGrade,
        subjectName: res.subjectName || "Subject",
        totalScore: score,
        letterGrade: letter,
      };

      if (score >= 80) {
        topPerformers.push(performerItem);
      } else if (score < 50) {
        needsSupport.push(performerItem);
      }
    }

    topPerformers.sort((a, b) => b.totalScore - a.totalScore);
    needsSupport.sort((a, b) => a.totalScore - b.totalScore);

    const totalResultsCount = passingResultsCount + failingResultsCount;
    const averageScore = totalResultsCount > 0 ? Math.round((totalScoreSum / totalResultsCount) * 10) / 10 : 0;
    const passingRate = totalResultsCount > 0 ? Math.round((passingResultsCount / totalResultsCount) * 100) : 0;

    const resultsByGrade = Array.from(gradeResultsMap.entries())
      .filter(([gradeName, gr]) => {
        if (grade && gradeName !== grade) return false;
        return gr.count > 0 || gradeOrderMap.has(gradeName);
      })
      .sort((a, b) => {
        const orderA = gradeOrderMap.get(a[0]) ?? 999;
        const orderB = gradeOrderMap.get(b[0]) ?? 999;
        return orderA - orderB;
      })
      .map(([gradeName, gr]) => ({
        grade: gradeName,
        resultsCount: gr.count,
        avgScore: gr.count > 0 ? Math.round((gr.totalScore / gr.count) * 10) / 10 : 0,
        passCount: gr.pass,
        failCount: gr.fail,
        passRate: gr.count > 0 ? Math.round((gr.pass / gr.count) * 100) : 0,
      }));

    const gradeDistribution = Array.from(letterDistributionMap.entries())
      .map(([letter, count]) => ({ letter, count }))
      .filter((item) => item.count > 0 || ["A+", "A", "B", "C", "F"].includes(item.letter));

    // ─────────────────────────────────────────────────────────────────────────
    // 5. FACILITATORS & STAFF ACTIVITY
    // ─────────────────────────────────────────────────────────────────────────
    const staffDocs = await db.collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    let educationFacilitatorCount = 0;
    let attendanceFacilitatorCount = 0;
    let adminCount = 0;

    const gradeCoverageMap = new Map<string, Array<{ name: string; email: string; role: string }>>();
    GRADE_OPTIONS.forEach((opt) => {
      gradeCoverageMap.set(opt.value, []);
    });

    const staffList: Array<{
      _id: string;
      name: string;
      email: string;
      role: string;
      assignedGrades: string[];
      attendanceMarksCount: number;
    }> = [];

    for (const u of staffDocs) {
      const uRole = String(u.role || "");
      if (uRole.toLowerCase().includes("education")) educationFacilitatorCount++;
      else if (uRole.toLowerCase().includes("attendance") || uRole.toLowerCase().includes("hr facilitator")) attendanceFacilitatorCount++;
      else if (uRole.toLowerCase().includes("admin")) adminCount++;

      // Assigned grades
      let assignedGrades: string[] = [];
      if (Array.isArray(u.grade)) {
        assignedGrades = u.grade.map(String);
      } else if (typeof u.grade === "string" && u.grade.trim()) {
        assignedGrades = [u.grade.trim()];
      }

      for (const g of assignedGrades) {
        const currentList = gradeCoverageMap.get(g) || [];
        currentList.push({
          name: u.name || "—",
          email: u.email,
          role: u.role,
        });
        gradeCoverageMap.set(g, currentList);
      }

      const emailKey = String(u.email || "").trim();
      const markedCount = facilitatorMarkedCountMap.get(emailKey) || 0;

      staffList.push({
        _id: u._id.toString(),
        name: u.name || "—",
        email: u.email,
        role: u.role,
        assignedGrades,
        attendanceMarksCount: markedCount,
      });
    }

    staffList.sort((a, b) => b.attendanceMarksCount - a.attendanceMarksCount || a.name.localeCompare(b.name));

    const gradeCoverage = Array.from(gradeCoverageMap.entries())
      .filter(([gradeName]) => {
        if (grade && gradeName !== grade) return false;
        return true;
      })
      .sort((a, b) => {
        const orderA = gradeOrderMap.get(a[0]) ?? 999;
        const orderB = gradeOrderMap.get(b[0]) ?? 999;
        return orderA - orderB;
      })
      .map(([gradeName, facilitators]) => ({
        grade: gradeName,
        facilitatorCount: facilitators.length,
        hasFacilitator: facilitators.length > 0,
        facilitators,
      }));

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DISTINCT DROPDOWN OPTIONS
    // ─────────────────────────────────────────────────────────────────────────
    const distinctYears = Array.from(
      new Set([
        String(ecYear),
        ...allStudents
          .map((s) => String(s.Academic_Year).match(/\d{4}/)?.[0])
          .filter((y): y is string => Boolean(y)),
      ]),
    ).sort((a, b) => b.localeCompare(a));

    return NextResponse.json(
      {
        summary: {
          totalStudentsAllYears: allStudentsCount,
          totalStudentsFiltered: allStudents.length,
          totalStudentsCurrentEC: currentYearStudentsCount,
          attendanceStats: {
            totalRecords: totalAttendanceRecords,
            presentCount: totalPresentMarks,
            absentCount: totalAbsentMarks,
            presentRate: overallAttendanceRate,
          },
          paymentStats: {
            totalEvaluated: totalStudentsInPaymentScope,
            paidCount: paidStudentsCount,
            unpaidCount: unpaidStudentsCount,
            partialCount: partialPaidStudentsCount,
            collectionRate: paymentCollectionRate,
          },
          resultsStats: {
            totalResults: totalResultsCount,
            averageScore,
            passingRate,
            passCount: passingResultsCount,
            failCount: failingResultsCount,
          },
          staffStats: {
            totalStaff: staffDocs.length,
            educationFacilitators: educationFacilitatorCount,
            attendanceFacilitators: attendanceFacilitatorCount,
            admins: adminCount,
          },
        },
        demographics: {
          studentsByGrade,
          studentsByYear,
          studentsByClassification,
          gender: {
            male: totalMales,
            female: totalFemales,
            malePercentage: allStudents.length > 0 ? Math.round((totalMales / allStudents.length) * 100) : 0,
            femalePercentage: allStudents.length > 0 ? Math.round((totalFemales / allStudents.length) * 100) : 0,
          },
          rawStudents: allStudents.map((s) => ({
            _id: s._id.toString(),
            uniqueId: s.Unique_ID,
            name: [s.First_Name, s.Father_Name, s.Grandfather_Name].filter(Boolean).join(" "),
            grade: s.Grade || "Unassigned",
            academicYear: s.Academic_Year || "—",
            classification: s.Classification || "Regular",
            sex: s.Sex || "—",
            age: s.Age || "—",
            phoneNumber: s.Phone_Number || "—",
          })),
        },
        attendanceAnalytics: {
          byGrade: attendanceByGrade,
          frequentAbsences: frequentAbsences.slice(0, 50),
          totalFrequentAbsentCount: frequentAbsences.filter((x) => x.isHighRisk).length,
        },
        paymentAnalytics: {
          byGrade: paymentsByGrade,
          studentsPaymentList: studentPaymentsList.slice(0, 100),
          paidVsUnpaid: {
            paid: paidStudentsCount,
            unpaid: unpaidStudentsCount,
            partial: partialPaidStudentsCount,
          },
        },
        performanceAnalytics: {
          byGrade: resultsByGrade,
          gradeDistribution,
          topPerformers: topPerformers.slice(0, 10),
          needsSupport: needsSupport.slice(0, 10),
          rawResults: resultsDocs.map((r) => ({
            _id: r._id.toString(),
            studentId: String(r.studentId),
            studentName: r.studentName || "—",
            subjectName: r.subjectName || "—",
            academicYear: r.academicYear || "—",
            totalScore: r.totalScore ?? 0,
            letterGrade: r.grade || "—",
            recordedDate: r.recordedDate || "—",
          })),
        },
        facilitatorActivity: {
          coverage: gradeCoverage,
          staffList,
          byRole: [
            { role: "Education Facilitator", count: educationFacilitatorCount },
            { role: "Attendance Facilitator", count: attendanceFacilitatorCount },
            { role: "Admins", count: adminCount },
          ],
        },
        metadata: {
          academicYears: distinctYears,
          grades: GRADE_OPTIONS,
          currentEthiopianYear: ecYear,
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 200, headers: cors },
    );
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500, headers: cors });
  }
}
