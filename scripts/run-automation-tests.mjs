// scripts/run-automation-tests.mjs
/**
 * Automated Test Suite for Birhane Hiwot Sunday School Attendance System
 * (ብርሃነ ሕይወት ሰንበት ትምህርት ቤት የአቴንዳንስ እና የትምህርት ክፍል አስተዳደር ሲስተም)
 *
 * Runs end-to-end API test cases matching docs/qa/TEST-CASES.md
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://ym:sunday_school@ac-zoyajqc-shard-00-00.tchv8s6.mongodb.net:27017,ac-zoyajqc-shard-00-01.tchv8s6.mongodb.net:27017,ac-zoyajqc-shard-00-02.tchv8s6.mongodb.net:27017/?ssl=true&replicaSet=atlas-cbb0fr-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const MONGODB_DB = process.env.MONGODB_DB || "sunday_school";

// Color formatting for console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

class TestRunner {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.cookies = new Map();
    this.stats = { total: 0, passed: 0, failed: 0, skipped: 0 };
    this.results = [];
    this.context = {
      academicYear: "2018",
      grade: "አንደኛ ክፍል",
      date: "2018-05-15",
      superAdminEmail: "superadmin@birhanehiwot.org",
      superAdminPassword: "SuperAdminPass123!",
      testTimestamp: Date.now(),
    };
  }

  updateCookies(response) {
    // Collect all set-cookie headers (fetch may return them joined by comma or via getSetCookie())
    let cookieHeaders = [];
    if (typeof response.headers.getSetCookie === "function") {
      cookieHeaders = response.headers.getSetCookie();
    } else {
      const single = response.headers.get("set-cookie");
      if (single) {
        cookieHeaders = single.split(/,\s*(?=[a-zA-Z0-9_-]+=)/);
      }
    }

    for (const header of cookieHeaders) {
      const [nameVal] = header.split(";");
      const eqIdx = nameVal.indexOf("=");
      if (eqIdx !== -1) {
        const name = nameVal.substring(0, eqIdx).trim();
        const value = nameVal.substring(eqIdx + 1).trim();
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers = { ...options.headers };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    if (options.body && typeof options.body === "object" && !(options.body instanceof URLSearchParams)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, { ...options, headers, redirect: "manual" });
    this.updateCookies(res);

    let data = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch (err) {
        data = null;
      }
    } else {
      try {
        data = await res.text();
      } catch (err) {
        data = null;
      }
    }

    return { status: res.status, headers: res.headers, data };
  }

  async test(id, name, testFn) {
    this.stats.total++;
    const start = performance.now();
    try {
      await testFn();
      const duration = (performance.now() - start).toFixed(1);
      this.stats.passed++;
      this.results.push({ id, name, status: "PASS", duration });
      console.log(`  ${colors.green}✓ PASS${colors.reset} [${id}] ${name} ${colors.gray}(${duration}ms)${colors.reset}`);
    } catch (err) {
      const duration = (performance.now() - start).toFixed(1);
      this.stats.failed++;
      this.results.push({ id, name, status: "FAIL", duration, error: err.message });
      console.log(`  ${colors.red}✗ FAIL${colors.reset} [${id}] ${name} ${colors.gray}(${duration}ms)${colors.reset}`);
      console.log(`    ${colors.yellow}Error: ${err.message}${colors.reset}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message ? message + " : " : ""}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  assertIncludes(haystack, needle, message) {
    if (typeof haystack === "string" && !haystack.includes(needle)) {
      throw new Error(`${message ? message + " : " : ""}Expected string to contain ${JSON.stringify(needle)}`);
    } else if (Array.isArray(haystack) && !haystack.includes(needle)) {
      throw new Error(`${message ? message + " : " : ""}Expected array to contain ${JSON.stringify(needle)}`);
    }
  }
}

async function ensureSuperAdmin() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const dbsToSeed = ["sunday_school", "test"];

    const hashedPassword = await bcrypt.hash("SuperAdminPass123!", 10);

    for (const dbName of dbsToSeed) {
      try {
        const db = client.db(dbName);
        const users = db.collection("users");
        await users.updateOne(
          { email: "superadmin@birhanehiwot.org" },
          {
            $set: {
              name: "ሊቀ ትጉሃን ገብረመስቀል",
              email: "superadmin@birhanehiwot.org",
              password: hashedPassword,
              role: "Super Admin",
              updatedAt: new Date().toISOString(),
            },
            $setOnInsert: {
              createdAt: new Date().toISOString(),
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // Ignore errors on secondary DB
      }
    }
  } finally {
    await client.close();
  }
}

async function runAutomation() {
  console.log(`\n${colors.bright}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  Birhane Hiwot Sunday School — Automated QA Test Suite ${colors.reset}`);
  console.log(`${colors.cyan}  (ብርሃነ ሕይወት ሰንበት ትምህርት ቤት የአቴንዳንስ እና የትምህርት ክፍል)${colors.reset}`);
  console.log(`${colors.cyan}  Target: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================================================\n${colors.reset}`);

  // Ensure test Super Admin account is provisioned for full auth testing
  await ensureSuperAdmin();

  const runner = new TestRunner(BASE_URL);

  // ==========================================
  // SUITE 1: AUTHENTICATION & SETUP
  // ==========================================
  console.log(`${colors.bright}${colors.magenta}▶ Suite 1: Authentication, Setup & Mobile JWT${colors.reset}`);

  await runner.test("AUTH-012", "Super Admin Setup (one-time bootstrap / verification)", async () => {
    const res = await runner.request("/api/setup/super-admin", {
      method: "POST",
      body: {
        name: "ሊቀ ትጉሃን ገብረመስቀል",
        email: runner.context.superAdminEmail,
        password: runner.context.superAdminPassword,
        confirm: "CREATE_SUPER_ADMIN",
      },
    });
    runner.assert([200, 201, 409].includes(res.status), `Expected 200, 201, or 409, got ${res.status}`);
  });

  await runner.test("AUTH-013", "Setup with invalid confirm token fails with 400", async () => {
    const res = await runner.request("/api/setup/super-admin", {
      method: "POST",
      body: {
        email: "wrong@birhanehiwot.org",
        password: "Password123!",
        confirm: "INVALID_CONFIRM_KEY",
      },
    });
    runner.assertEqual(res.status, 400, "Should return 400 for invalid confirm token");
  });

  await runner.test("MOB-001", "Mobile JWT authentication returns token & user payload", async () => {
    const res = await runner.request("/api/mobile/auth", {
      method: "POST",
      body: {
        email: runner.context.superAdminEmail,
        password: runner.context.superAdminPassword,
      },
    });
    runner.assertEqual(res.status, 200, "Mobile login should return 200");
    runner.assert(res.data.token, "Mobile response must include signed JWT token");
    runner.assert(res.data.user, "Mobile response must include user object");
    runner.assertEqual(res.data.user.role, "Super Admin", "Role must be Super Admin");
    runner.context.mobileToken = res.data.token;
  });

  await runner.test("MOB-002", "Mobile authentication fails on invalid password (401)", async () => {
    const res = await runner.request("/api/mobile/auth", {
      method: "POST",
      body: {
        email: runner.context.superAdminEmail,
        password: "IncorrectPassword999!",
      },
    });
    runner.assertEqual(res.status, 401, "Expected 401 for wrong mobile password");
  });

  await runner.test("MOB-003", "Mobile auth OPTIONS CORS preflight returns 204", async () => {
    const res = await runner.request("/api/mobile/auth", { method: "OPTIONS" });
    runner.assertEqual(res.status, 204, "Expected 204 for CORS preflight");
  });

  await runner.test("AUTH-011", "NextAuth CSRF token retrieval", async () => {
    const res = await runner.request("/api/auth/csrf");
    runner.assertEqual(res.status, 200, "CSRF endpoint must return 200");
    runner.assert(res.data && res.data.csrfToken, "Response must contain csrfToken");
    runner.context.csrfToken = res.data.csrfToken;
  });

  await runner.test("AUTH-001", "NextAuth credentials login callback", async () => {
    const params = new URLSearchParams();
    params.append("csrfToken", runner.context.csrfToken);
    params.append("email", runner.context.superAdminEmail);
    params.append("password", runner.context.superAdminPassword);
    params.append("json", "true");
    params.append("callbackUrl", `${BASE_URL}/login`);

    const res = await runner.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    runner.assert([200, 302].includes(res.status), `Expected 200 or 302 on login, got ${res.status}`);
  });

  await runner.test("AUTH-010", "Verify active web session", async () => {
    const res = await runner.request("/api/auth/session");
    runner.assertEqual(res.status, 200, "Session endpoint must return 200");
    runner.assert(res.data && res.data.user, "Session must contain authenticated user");
    runner.assertEqual(res.data.user.email, runner.context.superAdminEmail, "Session user email must match");
  });

  // ==========================================
  // SUITE 2: FACILITATORS & ROLES
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 2: Facilitators & Roles Management${colors.reset}`);

  await runner.test("FAC-011", "List facilitator roles constants", async () => {
    const res = await runner.request("/api/facilitators/roles");
    runner.assertEqual(res.status, 200, "Expected 200 from /api/facilitators/roles");
    runner.assert(Array.isArray(res.data), "Roles should be an array");
    runner.assert(res.data.some((r) => r.value === "Attendance Facilitator"), "Must contain Attendance Facilitator");
  });

  const testFacilitatorEmail = `aut.facilitator.${runner.context.testTimestamp}@birhanehiwot.org`;
  let testFacilitatorId = null;

  await runner.test("FAC-003", "Create Attendance Facilitator with assigned grade", async () => {
    const res = await runner.request("/api/facilitators", {
      method: "POST",
      body: {
        name: "ዲ/ን ቴዎድሮስ ካሳሁን (Test)",
        email: testFacilitatorEmail,
        password: "Facilitator123!",
        role: "Attendance Facilitator",
        grade: [runner.context.grade],
      },
    });
    runner.assertEqual(res.status, 201, "Expected 201 on facilitator creation");
    runner.assert(res.data && res.data._id, "Created facilitator must return _id");
    testFacilitatorId = res.data._id;
  });

  await runner.test("FAC-004", "Create Attendance Facilitator without grade fails with 400", async () => {
    const res = await runner.request("/api/facilitators", {
      method: "POST",
      body: {
        name: "Test Facilitator",
        email: `nograde.${runner.context.testTimestamp}@birhanehiwot.org`,
        password: "Facilitator123!",
        role: "Attendance Facilitator",
        grade: [],
      },
    });
    runner.assertEqual(res.status, 400, "Expected 400 for missing grade");
  });

  await runner.test("FAC-001", "List facilitators", async () => {
    const res = await runner.request("/api/facilitators");
    runner.assertEqual(res.status, 200, "Expected 200 from /api/facilitators");
    runner.assert(Array.isArray(res.data), "Facilitators must be an array");
  });

  if (testFacilitatorId) {
    await runner.test("FAC-009", "Toggle canAddStudent permission via PATCH", async () => {
      const res = await runner.request(`/api/facilitators/${testFacilitatorId}`, {
        method: "PATCH",
        body: { canAddStudent: true },
      });
      runner.assertEqual(res.status, 200, "Expected 200 from canAddStudent PATCH");
      runner.assertEqual(res.data.canAddStudent, true, "canAddStudent should be true");
    });

    await runner.test("FAC-006", "Update facilitator profile via PUT", async () => {
      const res = await runner.request("/api/facilitators", {
        method: "PUT",
        body: {
          id: testFacilitatorId,
          name: "ዲ/ን ቴዎድሮስ ካሳሁን (Updated)",
          email: testFacilitatorEmail,
          role: "Attendance Facilitator",
          grade: [runner.context.grade, "ሁለተኛ ክፍል"],
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on facilitator update");
    });
  }

  await runner.test("FAC-010", "Get total facilitators count", async () => {
    const res = await runner.request("/api/facilitators/total");
    runner.assertEqual(res.status, 200, "Expected 200 from /api/facilitators/total");
    runner.assert(typeof res.data.total === "number", "Total must be a number");
  });

  // Education Facilitators
  const testEduFacEmail = `aut.edufac.${runner.context.testTimestamp}@birhanehiwot.org`;
  let testEduFacId = null;

  await runner.test("FAC-012", "Education Facilitator CRUD flow", async () => {
    // Create
    const createRes = await runner.request("/api/education-facilitators", {
      method: "POST",
      body: {
        name: "መርጌታ ዘርዓይ በርሄ (Test)",
        email: testEduFacEmail,
        password: "Facilitator123!",
      },
    });
    runner.assertEqual(createRes.status, 201, "Expected 201 on education facilitator creation");
    testEduFacId = createRes.data._id;

    // Update
    const updateRes = await runner.request("/api/education-facilitators", {
      method: "PUT",
      body: {
        id: testEduFacId,
        name: "መርጌታ ዘርዓይ በርሄ (Updated)",
        email: testEduFacEmail,
      },
    });
    runner.assertEqual(updateRes.status, 200, "Expected 200 on education facilitator update");

    // Delete
    const deleteRes = await runner.request("/api/education-facilitators", {
      method: "DELETE",
      body: { id: testEduFacId },
    });
    runner.assertEqual(deleteRes.status, 200, "Expected 200 on education facilitator delete");
  });

  // ==========================================
  // SUITE 3: TEACHERS, SUBJECTS & ASSIGNMENTS
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 3: Teachers, Subjects & Curriculum${colors.reset}`);

  const testTeacherEmail = `aut.teacher.${runner.context.testTimestamp}@birhanehiwot.org`;
  let testTeacherId = null;

  await runner.test("TCH-002", "Create Teacher with assigned subjects & grade", async () => {
    const res = await runner.request("/api/teachers", {
      method: "POST",
      body: {
        name: "መምህር አስፋው ወልደሥላሴ (Test)",
        email: testTeacherEmail,
        grade: runner.context.grade,
        assignedSubjects: ["ስርዓተ ቤተክርስቲያን", "ነገረ ሃይማኖት"],
      },
    });
    runner.assertEqual(res.status, 201, "Expected 201 on teacher creation");
    testTeacherId = res.data._id;
    runner.assert(testTeacherId, "Created teacher must return _id");
  });

  await runner.test("TCH-001", "List teachers", async () => {
    const res = await runner.request("/api/teachers");
    runner.assertEqual(res.status, 200, "Expected 200 from /api/teachers");
    runner.assert(Array.isArray(res.data), "Teachers must be an array");
  });

  let testSubjectGroupId = null;
  const testSubjectName = `ስርዓተ_ፈተና_${runner.context.testTimestamp}`;

  await runner.test("SUB-002", "Add subject to grade group", async () => {
    const res = await runner.request("/api/subjects", {
      method: "POST",
      body: {
        name: testSubjectName,
        grade: runner.context.grade,
        gradeNumber: 1,
        academicYear: runner.context.academicYear,
      },
    });
    runner.assertEqual(res.status, 201, "Expected 201 on subject creation");
    testSubjectGroupId = res.data._id;
    runner.assert(res.data.subjects.includes(testSubjectName), "Subject should be in subjects array");
  });

  await runner.test("SUB-001", "List grouped subjects for academic year & grade", async () => {
    const res = await runner.request(`/api/subjects?academicYear=${runner.context.academicYear}&grade=${encodeURIComponent(runner.context.grade)}`);
    runner.assertEqual(res.status, 200, "Expected 200 from GET /api/subjects");
    runner.assert(Array.isArray(res.data), "Expected subjects to be an array");
  });

  await runner.test("SUB-004", "Batch create authentic Orthodox Sunday School subjects", async () => {
    const res = await runner.request("/api/subjects/batch", {
      method: "POST",
      body: {
        subjects: [
          { name: "ነገረ ሃይማኖት", grade: runner.context.grade, gradeNumber: 1, academicYear: runner.context.academicYear },
          { name: "የመጽሐፍ ቅዱስ ጥናት", grade: runner.context.grade, gradeNumber: 1, academicYear: runner.context.academicYear },
          { name: "ክርስቲያናዊ ስነ ምግባር", grade: runner.context.grade, gradeNumber: 1, academicYear: runner.context.academicYear },
        ],
      },
    });
    runner.assert([200, 207].includes(res.status), `Expected 200 or 207 from batch subjects, got ${res.status}`);
    runner.assert(res.data && res.data.summary, "Batch response must include summary object");
  });

  let testAssignmentId = null;
  if (testTeacherId && testSubjectGroupId) {
    await runner.test("TAS-002", "Create teacher-to-subject assignment", async () => {
      const res = await runner.request("/api/teacher-assignments", {
        method: "POST",
        body: {
          teacherId: testTeacherId,
          subjectId: testSubjectGroupId,
          grade: runner.context.grade,
          academicYear: runner.context.academicYear,
        },
      });
      runner.assertEqual(res.status, 201, "Expected 201 on teacher assignment");
      testAssignmentId = res.data._id;
      runner.assert(testAssignmentId, "Created assignment must return _id");
    });

    await runner.test("TAS-001", "List teacher assignments", async () => {
      const res = await runner.request("/api/teacher-assignments");
      runner.assertEqual(res.status, 200, "Expected 200 from GET /api/teacher-assignments");
      runner.assert(Array.isArray(res.data), "Assignments must be an array");
    });
  }

  // ==========================================
  // SUITE 4: CATEGORY PERIODS (REGISTRATION WINDOWS)
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 4: Category Registration Periods${colors.reset}`);

  await runner.test("PER-001", "List category periods", async () => {
    const res = await runner.request("/api/category-periods");
    runner.assertEqual(res.status, 200, "Expected 200 from GET /api/category-periods");
    runner.assert(Array.isArray(res.data), "Periods must be an array");
  });

  await runner.test("PER-003", "Create / Upsert Category Period for Regular classification", async () => {
    const res = await runner.request("/api/category-periods", {
      method: "POST",
      body: {
        classification: "Regular",
        academicYear: runner.context.academicYear,
        startDate: "2018-01-01",
        endDate: "2018-12-30",
        registrationClosedDate: "",
        isActive: true,
      },
    });
    runner.assertEqual(res.status, 200, "Expected 200 on category period upsert");
  });

  await runner.test("PER-004", "Category Period rejects missing fields with 400", async () => {
    const res = await runner.request("/api/category-periods", {
      method: "POST",
      body: { startDate: "2018-01-01" },
    });
    runner.assertEqual(res.status, 400, "Should return 400 for missing classification and academicYear");
  });

  // ==========================================
  // SUITE 5: STUDENT MANAGEMENT & DUPLICATE CHECKS
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 5: Student Registration & Profile Management${colors.reset}`);

  const testStudentUniqueId = `BH-AUT-${runner.context.testTimestamp}`;
  let testStudentId = null;

  const testStudentData = {
    Unique_ID: testStudentUniqueId,
    First_Name: "አማኑኤል",
    Father_Name: "ተክሌ",
    Grandfather_Name: "ገብረማርያም",
    Mothers_Name: "ወለተ ዮሐንስ",
    Christian_Name: "ኃይለ ሚካኤል",
    DOB_Date: "15",
    DOB_Month: "05",
    DOB_Year: "2010",
    Age: 8,
    Sex: "Male",
    Phone_Number: "0911234567",
    Class: "Regular",
    Occupation: "Student",
    School: "አቡነ ጎርጎርዮስ",
    Address: "ሲቪል ሰርቪስ አካባቢ",
    Academic_Year: runner.context.academicYear,
    Grade: runner.context.grade,
    Classification: "Regular",
    userRole: "Super Admin",
  };

  await runner.test("STU-006", "Register new student with authentic Amharic Ethiopian data", async () => {
    const res = await runner.request("/api/students", {
      method: "POST",
      body: testStudentData,
    });
    runner.assertEqual(res.status, 201, "Expected 201 on student creation");
    runner.assert(res.data && res.data._id, "Created student must return MongoDB _id");
    testStudentId = res.data._id;
  });

  await runner.test("STU-007", "Student registration missing required field returns 400", async () => {
    const invalidData = { ...testStudentData };
    delete invalidData.First_Name;
    const res = await runner.request("/api/students", {
      method: "POST",
      body: invalidData,
    });
    runner.assertEqual(res.status, 400, "Should return 400 when required field is missing");
  });

  await runner.test("STU-020", "Check duplicate student returns true for existing student", async () => {
    const res = await runner.request("/api/students/check-duplicate", {
      method: "POST",
      body: {
        First_Name: testStudentData.First_Name,
        Father_Name: testStudentData.Father_Name,
        Grandfather_Name: testStudentData.Grandfather_Name,
        Mothers_Name: testStudentData.Mothers_Name,
        Sex: testStudentData.Sex,
      },
    });
    runner.assertEqual(res.status, 200, "Duplicate check must return 200");
    runner.assertEqual(res.data.exists, true, "Expected exists to be true for registered student");
  });

  await runner.test("STU-021", "Check duplicate student returns false for unrecorded student", async () => {
    const res = await runner.request("/api/students/check-duplicate", {
      method: "POST",
      body: {
        First_Name: "ስማቸው_ያልተመዘገበ",
        Father_Name: "የሌለ_አባት",
        Grandfather_Name: "የሌለ_አያት",
        Mothers_Name: "የሌለች_እናት",
        Sex: "Female",
      },
    });
    runner.assertEqual(res.status, 200, "Duplicate check must return 200");
    runner.assertEqual(res.data.exists, false, "Expected exists to be false");
  });

  await runner.test("STU-001", "List students with grade and academic year filter", async () => {
    const res = await runner.request(`/api/students?grade=${encodeURIComponent(runner.context.grade)}&academicYear=${runner.context.academicYear}&limit=10`);
    runner.assertEqual(res.status, 200, "Expected 200 from GET /api/students");
    runner.assert(Array.isArray(res.data), "Expected student list to be an array");
    runner.assert(res.data.length > 0, "Student list should not be empty");
  });

  await runner.test("STU-004", "Get student by Unique_ID query param", async () => {
    const res = await runner.request(`/api/students?uniqueId=${testStudentUniqueId}`);
    runner.assertEqual(res.status, 200, "Expected 200 from uniqueId query lookup");
    runner.assertEqual(res.data.Unique_ID, testStudentUniqueId, "Unique_ID must match");
  });

  await runner.test("STU-005", "Get student by ID or Unique_ID path param", async () => {
    const res = await runner.request(`/api/students/${testStudentUniqueId}`);
    runner.assertEqual(res.status, 200, "Expected 200 from path lookup");
    runner.assertEqual(res.data.First_Name, testStudentData.First_Name, "First_Name must match");
  });

  await runner.test("STU-023", "Count students by grade and academic year", async () => {
    const res = await runner.request("/api/students/count", {
      method: "POST",
      body: {
        academicYear: runner.context.academicYear,
        grade: runner.context.grade,
        classification: "Regular",
      },
    });
    runner.assertEqual(res.status, 200, "Expected 200 from /api/students/count");
    runner.assert(typeof res.data.count === "number" && res.data.count >= 1, "Count should be >= 1");
  });

  await runner.test("STU-025", "Get total registered students count", async () => {
    const res = await runner.request("/api/students/total");
    runner.assertEqual(res.status, 200, "Expected 200 from /api/students/total");
    runner.assert(typeof res.data.total === "number", "Total must be a number");
  });

  if (testStudentId) {
    await runner.test("STU-015", "Update student profile via PUT", async () => {
      const res = await runner.request(`/api/students/${testStudentId}`, {
        method: "PUT",
        body: {
          ...testStudentData,
          Phone_Number: "0911998877",
          Address: "መሪ",
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on student update");
      runner.assertEqual(res.data.Phone_Number, "0911998877", "Phone_Number must be updated");
    });

    await runner.test("STU-017", "Update student photo via PATCH", async () => {
      const res = await runner.request(`/api/students/${testStudentId}`, {
        method: "PATCH",
        body: {
          photo_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on photo PATCH");
      runner.assert(res.data.photo_data_url, "Photo data URL should be updated");
    });

    await runner.test("STU-018", "Regenerate student QR code via PATCH", async () => {
      const res = await runner.request(`/api/students/${testStudentId}`, {
        method: "PATCH",
        body: { generateQR: true },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on QR regeneration");
    });
  }

  // ==========================================
  // SUITE 6: ATTENDANCE
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 6: Bulk Attendance & Summaries${colors.reset}`);

  if (testStudentId) {
    await runner.test("ATT-006", "Mark attendance (bulk upsert)", async () => {
      const res = await runner.request("/api/attendance", {
        method: "POST",
        body: {
          date: runner.context.date,
          attendance: [
            {
              studentId: testStudentId,
              date: runner.context.date,
              present: true,
              hasPermission: false,
              reason: "",
              markedBy: "Attendance Facilitator",
              timestamp: "15 Tir 2018",
            },
          ],
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on bulk attendance marking");
      runner.assertEqual(res.data.success, true, "Success should be true");
    });

    await runner.test("ATT-009", "Idempotent attendance re-submit updates without duplicate rows", async () => {
      const res = await runner.request("/api/attendance", {
        method: "POST",
        body: {
          date: runner.context.date,
          attendance: [
            {
              studentId: testStudentId,
              date: runner.context.date,
              present: false,
              hasPermission: true,
              reason: "በህመም ምክንያት",
              markedBy: "Attendance Facilitator",
            },
          ],
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on attendance update");
      runner.assert(res.data.updatedCount >= 1, "Expected updatedCount to increment");
    });

    await runner.test("ATT-001", "List attendance records by date", async () => {
      const res = await runner.request(`/api/attendance?date=${runner.context.date}`);
      runner.assertEqual(res.status, 200, "Expected 200 from GET /api/attendance");
      runner.assert(Array.isArray(res.data), "Attendance records must be an array");
    });

    await runner.test("ATT-003", "Attendance summary mode returns total & present counts", async () => {
      const res = await runner.request(`/api/attendance?date=${runner.context.date}&summary=true`);
      runner.assertEqual(res.status, 200, "Expected 200 from summary query");
      runner.assert(typeof res.data.total === "number", "Summary must return total count");
      runner.assert(typeof res.data.present === "number", "Summary must return present count");
    });

    await runner.test("ATT-012", "Get student attendance history", async () => {
      const res = await runner.request(`/api/attendance/${testStudentId}`);
      runner.assertEqual(res.status, 200, "Expected 200 from student history");
      runner.assert(Array.isArray(res.data), "History must be an array");
    });
  }

  // ==========================================
  // SUITE 7: STUDENT ACADEMIC RESULTS
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 7: Academic Results & University Letter Grading${colors.reset}`);

  let testResultId = null;

  if (testStudentId && testSubjectGroupId) {
    await runner.test("RES-003", "Record student result and verify letter grade calculation (A+)", async () => {
      const res = await runner.request("/api/student-results", {
        method: "POST",
        body: {
          studentId: testStudentId,
          studentName: "አማኑኤል ተክሌ ገብረማርያም",
          subjectId: testSubjectGroupId,
          subjectName: "ስርዓተ ቤተክርስቲያን",
          academicYear: runner.context.academicYear,
          assignment1: 9,
          assignment2: 10,
          midTest: 28,
          finalExam: 48,
          remarks: "እጅግ በጣም ጥሩ ውጤት",
        },
      });

      runner.assertEqual(res.status, 201, "Expected 201 on result creation");
      testResultId = res.data._id;
      runner.assertEqual(res.data.totalScore, 95, "Total score should be 9 + 10 + 28 + 48 = 95");
      runner.assertEqual(res.data.grade, "A+", "Total 95 should calculate to A+ grade");
      runner.assert(res.data.recordedDate, "Result must include Ethiopian recordedDate");
    });

    await runner.test("RES-001", "List all student results", async () => {
      const res = await runner.request("/api/student-results");
      runner.assertEqual(res.status, 200, "Expected 200 from GET /api/student-results");
      runner.assert(Array.isArray(res.data), "Results must be an array");
    });

    await runner.test("RES-002", "Filter student results by studentId", async () => {
      const res = await runner.request(`/api/student-results?studentId=${testStudentId}`);
      runner.assertEqual(res.status, 200, "Expected 200 from studentId results filter");
      runner.assert(Array.isArray(res.data), "Results must be an array");
    });

    if (testResultId) {
      await runner.test("RES-010", "Get student result by ID", async () => {
        const res = await runner.request(`/api/student-results/${testResultId}`);
        runner.assertEqual(res.status, 200, "Expected 200 from GET /api/student-results/:id");
        runner.assertEqual(res.data._id, testResultId, "Result ID must match");
      });

      await runner.test("RES-011", "Update student result recalculates total & grade", async () => {
        const res = await runner.request(`/api/student-results/${testResultId}`, {
          method: "PUT",
          body: {
            studentName: "አማኑኤል ተክሌ ገብረማርያም",
            subjectName: "ስርዓተ ቤተክርስቲያን",
            assignment1: 8,
            assignment2: 8,
            midTest: 20,
            finalExam: 36, // Total = 72 -> Grade B
            remarks: "የተሻሻለ ውጤት",
          },
        });
        runner.assertEqual(res.status, 200, "Expected 200 on result update");
      });
    }
  }

  // ==========================================
  // SUITE 8: 13-MONTH ETHIOPIAN PAYMENTS
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 8: 13-Month Ethiopian Payment Tracking${colors.reset}`);

  if (testStudentId) {
    await runner.test("PAY-001", "Lazy initialization of all 13 Ethiopian months", async () => {
      const res = await runner.request(`/api/payment?year=${runner.context.academicYear}&studentId=${testStudentId}`);
      runner.assertEqual(res.status, 200, "Expected 200 from GET /api/payment");
      runner.assert(res.data && res.data.data, "Response must include data object");
      runner.assert(res.data.data.Meskerem, "Must include Meskerem");
      runner.assert(res.data.data.Pagumē, "Must include Pagumē (13th month)");
    });

    await runner.test("PAY-003", "Save monthly fee payment status", async () => {
      const res = await runner.request("/api/payment", {
        method: "POST",
        body: {
          year: runner.context.academicYear,
          studentId: testStudentId,
          data: {
            Meskerem: { status: "Paid", amount: "500" },
            Tikimt: { status: "Paid", amount: "500" },
            Hidar: { status: "Paid", amount: "500" },
          },
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 from POST /api/payment");
    });
  }

  // ==========================================
  // SUITE 9: STUDENT REGISTRATION REQUESTS
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 9: Student Requests Approval Workflow${colors.reset}`);

  let testStudentRequestId = null;

  await runner.test("REQ-001", "Submit student registration request", async () => {
    const res = await runner.request("/api/student-requests", {
      method: "POST",
      body: {
        studentData: {
          Unique_ID: `BH-REQ-${runner.context.testTimestamp}`,
          First_Name: "ሳሙኤል",
          Father_Name: "ኃይሉ",
          Grandfather_Name: "ደስታ",
          Mothers_Name: "እቴነሽ ወርቁ",
          Christian_Name: "ገብረ መስቀል",
          DOB_Date: "10",
          DOB_Month: "03",
          DOB_Year: "2012",
          Age: 6,
          Sex: "Male",
          Phone_Number: "0911556677",
          Class: "Regular",
          Occupation: "Student",
          School: "ቅዱስ ሚካኤል",
          Address: "ጥቁር አባይ/ሚካኤል ጀርባ አካባቢ",
          Academic_Year: runner.context.academicYear,
          Grade: runner.context.grade,
          Classification: "Regular",
        },
        requestedBy: "Attendance Facilitator",
        requestedByName: "ዲ/ን ቴዎድሮስ ካሳሁን",
      },
    });

    runner.assertEqual(res.status, 201, "Expected 201 on request submission");
    runner.assert(res.data && res.data._id, "Request must return _id");
    testStudentRequestId = res.data._id;
  });

  await runner.test("REQ-003", "List pending student requests", async () => {
    const res = await runner.request("/api/student-requests?status=pending");
    runner.assertEqual(res.status, 200, "Expected 200 from GET /api/student-requests");
    runner.assert(Array.isArray(res.data), "Requests must be an array");
  });

  if (testStudentRequestId) {
    await runner.test("REQ-004", "Get student request by ID", async () => {
      const res = await runner.request(`/api/student-requests/${testStudentRequestId}`);
      runner.assertEqual(res.status, 200, "Expected 200 from GET /api/student-requests/:id");
      runner.assertEqual(res.data._id, testStudentRequestId, "Request ID must match");
    });

    await runner.test("REQ-005", "Approve student request", async () => {
      const res = await runner.request("/api/student-requests", {
        method: "PATCH",
        body: {
          id: testStudentRequestId,
          status: "approved",
          approvedBy: "Super Admin",
        },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on request approval");
    });
  }

  // ==========================================
  // SUITE 10: QR & UTILITIES
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Suite 10: QR Code Verification & System Utilities${colors.reset}`);

  await runner.test("QR-005", "QR verify rejects empty payload with 400", async () => {
    const res = await runner.request("/api/qr/verify", {
      method: "POST",
      body: { text: "" },
    });
    runner.assertEqual(res.status, 400, "Expected 400 for empty QR text");
  });

  await runner.test("UTIL-001", "Google Sheets health check endpoint", async () => {
    const res = await runner.request("/api/sheet/health");
    runner.assert([200, 500, 503].includes(res.status), `Expected 200, 500, or 503, got ${res.status}`);
  });

  await runner.test("UTIL-002", "Attendance aggregation cron endpoint", async () => {
    const res = await runner.request(`/api/cron/aggregate-attendance?date=${runner.context.date}`);
    runner.assertEqual(res.status, 200, "Expected 200 from cron aggregate endpoint");
  });

  // ==========================================
  // CLEANUP / TEARDOWN
  // ==========================================
  console.log(`\n${colors.bright}${colors.magenta}▶ Cleanup: Removing Temporary Automated Test Data${colors.reset}`);

  if (testStudentId) {
    await runner.test("TEARDOWN-001", "Delete created test student", async () => {
      const res = await runner.request("/api/students", {
        method: "DELETE",
        body: { id: testStudentId },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on test student cleanup");
    });
  }

  if (testResultId) {
    await runner.test("TEARDOWN-002", "Delete created test student result", async () => {
      const res = await runner.request(`/api/student-results/${testResultId}`, {
        method: "DELETE",
      });
      runner.assertEqual(res.status, 200, "Expected 200 on result cleanup");
    });
  }

  if (testAssignmentId) {
    await runner.test("TEARDOWN-003", "Delete created teacher assignment", async () => {
      const res = await runner.request(`/api/teacher-assignments/${testAssignmentId}`, {
        method: "DELETE",
      });
      runner.assertEqual(res.status, 200, "Expected 200 on assignment cleanup");
    });
  }

  if (testSubjectGroupId && testSubjectName) {
    await runner.test("TEARDOWN-004", "Remove test subject from group", async () => {
      const res = await runner.request(`/api/subjects/${testSubjectGroupId}`, {
        method: "DELETE",
        body: { name: testSubjectName },
      });
      runner.assertEqual(res.status, 200, "Expected 200 on subject cleanup");
    });
  }

  if (testTeacherId) {
    await runner.test("TEARDOWN-005", "Delete created test teacher", async () => {
      const res = await runner.request("/api/teachers", {
        method: "DELETE",
        body: { id: testTeacherId },
      });
      runner.assert([200, 403].includes(res.status), "Cleanup test teacher");
    });
  }

  if (testFacilitatorId) {
    await runner.test("TEARDOWN-006", "Delete created test facilitator", async () => {
      const res = await runner.request("/api/facilitators", {
        method: "DELETE",
        body: { id: testFacilitatorId },
      });
      runner.assert([200, 403].includes(res.status), "Cleanup test facilitator");
    });
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log(`\n${colors.bright}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  Automated Test Execution Summary${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`  Total Tests Run : ${colors.bright}${runner.stats.total}${colors.reset}`);
  console.log(`  Passed          : ${colors.green}${runner.stats.passed}${colors.reset}`);
  console.log(`  Failed          : ${runner.stats.failed > 0 ? colors.red : colors.gray}${runner.stats.failed}${colors.reset}`);
  console.log(`  Pass Rate       : ${colors.bright}${((runner.stats.passed / runner.stats.total) * 100).toFixed(1)}%${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================================================\n${colors.reset}`);

  if (runner.stats.failed > 0) {
    process.exit(1);
  }
}

runAutomation().catch((err) => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, err);
  process.exit(1);
});
