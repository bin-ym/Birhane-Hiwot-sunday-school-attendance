# Birhane Hiwot Sunday School — QA Test Case Document
# (ብርሃነ ሕይወት ሰንበት ትምህርት ቤት የፈተና እና የጥራት ቁጥጥር ሰነድ)

**Application:** Birhane Hiwot Sunday School Attendance & Education Management System (Web & API)  
**Version:** 1.0.0  
**Last updated:** August 26, 2026  
**Related assets:**  
- [Postman Collection](file:///c:/Users/Ym/Desktop/b/ss/Birhane-Hiwot-sunday-school-attendance/docs/qa/Birhane-Hiwot-API.postman_collection.json)  
- [Postman Environment](file:///c:/Users/Ym/Desktop/b/ss/Birhane-Hiwot-sunday-school-attendance/docs/qa/Birhane-Hiwot.postman_environment.json)  
- [OpenAPI Specification](file:///c:/Users/Ym/Desktop/b/ss/Birhane-Hiwot-sunday-school-attendance/public/openapi.json) (Interactive Swagger UI at `/api-docs`)  

---

## 1. Test Scope

| In scope | Out of scope |
|----------|--------------|
| Authentication & session management (NextAuth Credentials & Mobile JWT) | Third-party Google Sheets cloud availability (tested via health endpoint) |
| Role-based access control (Super Admin, HR Admin, Education Admin, Facilitators, Teachers) | Network hardware benchmarking |
| Student CRUD, check duplicate, grade counts, QR codes, registration gating | Third-party SMS/telecom gateways |
| Bulk attendance marking with distributed locking, filtering & summaries | Penetration testing of third-party hosting infrastructure |
| Attendance Facilitator & Education Facilitator user management | |
| Teacher profiles, curriculum subjects grouping, batch operations, & assignments | |
| Student academic results, score aggregation, & university letter grade mapping | |
| Student registration request submission & admin approval workflow | |
| 13-month Ethiopian fee payment tracking | |
| HMAC-SHA256 signed QR code generation & verification | |
| Excel and PDF reporting & export | |

---

## 2. Test Environment

| Item | Value |
|------|-------|
| Base URL (Local) | `http://localhost:3000` |
| Base URL (Production / Staging) | `https://birhane-hiwot-sunday-school-attenda.vercel.app` |
| Database | MongoDB Atlas (`MONGODB_URI`) |
| Web Auth | NextAuth Credentials provider, JWT session (`NEXTAUTH_SECRET`), 24h expiration |
| Mobile Auth | Direct signed HS256 JWT (`/api/mobile/auth`), 7-day expiration |
| Distributed Locks | Redis (`REDIS_URL`) / In-memory fallback for date & Unique_ID concurrency |
| Calendar System | Ethiopian Calendar (13 Ethiopian months, Academic Year `2018`, `2017`) |

### Authentic Test Accounts

| Role | Canonical Test Name | Purpose / Responsibility |
|------|---------------------|--------------------------|
| Super Admin | ሊቀ ትጉሃን ገብረመስቀል | Full system administration; manages department admins via `/api/admin-users` |
| HR Admin | ቀሲስ ዳዊት በቀለ | HR module, attendance facilitators, student records, permission toggles |
| Education Admin | ሊቀ ዲያቆናት ሰለሞን | Education module, teachers, subjects, education facilitators, academic results |
| Attendance Facilitator | ዲ/ን ቴዎድሮስ ካሳሁን | Marks attendance for assigned grades; creates students when `canAddStudent` is true |
| Education Facilitator | መርጌታ ዘርዓይ በርሄ | Educational result entry, exam recording, grade reports |
| Teacher | መምህር አስፋው ወልደሥላሴ | Assigned classes, subjects, and student roster access |

---

## 3. Test Case Summary

| Module | Total Cases | Priority High |
|--------|-------------|---------------|
| Authentication & Setup (Web & Mobile) | 18 | 14 |
| Authorization / RBAC | 18 | 16 |
| Student Management | 31 | 22 |
| Attendance | 16 | 13 |
| Facilitators & Education Facilitators | 15 | 12 |
| Teachers, Subjects & Assignments | 17 | 11 |
| Category Periods (Registration Windows) | 5 | 3 |
| Student Results | 13 | 9 |
| Payments (13 Ethiopian Months) | 8 | 6 |
| Student Requests Approval Workflow | 10 | 8 |
| QR Code Generation & Verification | 6 | 5 |
| Reports & Export | 8 | 4 |
| Negative & Security Edge Cases | 8 | 4 |
| **Total** | **173** | **127** |

---

## 4. Authentication & Setup

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-001 | Valid web login | Enter valid email (`superadmin@birhanehiwot.org`) and password on `/login`, submit | Redirect to role dashboard; `next-auth.session-token` cookie set | High |
| AUTH-002 | Invalid password | Enter valid email, wrong password | 401 error message; user remains on login page | High |
| AUTH-003 | Invalid email | Enter non-existent email address | 401 error message; no session created | High |
| AUTH-004 | Empty fields | Submit with blank email or password | Form validation prevents submit | High |
| AUTH-005 | Case-insensitive email | Login with `SUPERADMIN@birhanehiwot.org` | Login succeeds seamlessly | Medium |
| AUTH-006 | Session persistence | Login, refresh browser page | User remains authenticated via JWT session | High |
| AUTH-007 | Session expiry | Invalidate cookie or simulate 24h expiration | User redirected to `/login` | Medium |
| AUTH-008 | Web logout | Click logout or POST `/api/auth/signout` | Session cookie cleared; redirected to login | High |
| AUTH-009 | Protected route without auth | Navigate to `/admin/dashboard` while logged out | Redirected to `/login` with callbackUrl | High |
| AUTH-010 | Web session API check | GET `/api/auth/session` while authenticated | Returns `{ user: { id, name, email, role, grade, canAddStudent } }` | Medium |
| AUTH-011 | CSRF token flow | GET `/api/auth/csrf` then POST to credentials callback | Login succeeds with valid CSRF token | Medium |
| AUTH-012 | Super Admin setup (one-time) | POST `/api/setup/super-admin` with `confirm: "CREATE_SUPER_ADMIN"`, email, and password | 201 Created, `{ message, created: true, userId }` | High |
| AUTH-013 | Setup — invalid confirm token | POST setup with wrong `confirm` string | 400 `Setup confirmation is invalid` | High |
| AUTH-014 | Setup — password too short | POST setup with password < 6 characters | 400 `Password must be at least 6 characters` | Medium |
| AUTH-015 | Setup — idempotent when exists | POST setup again after Super Admin exists | 200 OK, `{ created: false, message: "Super Admin already exists" }` | Medium |
| MOB-001 | Mobile login valid credentials | POST `/api/mobile/auth` with valid facilitator credentials | 200 OK, returns `{ token, user: { id, email, name, role, grade } }` | High |
| MOB-002 | Mobile login invalid credentials | POST `/api/mobile/auth` with wrong password | 401 `Invalid email or password` | High |
| MOB-003 | Mobile CORS preflight | OPTIONS `/api/mobile/auth` | 204 No Content with `Access-Control-Allow-Origin: *` | Medium |

---

## 5. Authorization (Role-Based Access)

| ID | Test Case | Role | Route / Action | Expected Result | Priority |
|----|-----------|------|----------------|-----------------|----------|
| RBAC-001 | Super Admin full access | Super Admin | `/super-admin/*` pages | Access granted | High |
| RBAC-002 | Non-super blocked from super-admin | HR Admin | `/super-admin/dashboard` | Access denied / redirect | High |
| RBAC-003 | HR Admin HR module | HR Admin | `/hr/*` | Access granted | High |
| RBAC-004 | HR Admin blocked from education | HR Admin | `/education/*` | Access denied | High |
| RBAC-005 | Education Admin education module | Education Admin | `/education/*` | Access granted | High |
| RBAC-006 | Attendance Facilitator attendance | Attendance Facilitator | `/facilitator/attendance/*` (assigned grades only) | Access granted | High |
| RBAC-007 | Attendance Facilitator results blocked | Attendance Facilitator | `/facilitator/results/*` | Access denied | High |
| RBAC-008 | Education Facilitator results | Education Facilitator | `/facilitator/results/*` | Access granted | High |
| RBAC-009 | HR Admin student records access | HR Admin | `/admin/students`, `/admin/facilitators`, `/admin/reports` | Access granted | High |
| RBAC-010 | HR Admin blocked from unauthorized routes | HR Admin | `/admin/dashboard` (if restricted) | Access denied | Medium |
| RBAC-011 | Education Admin facilitator & report access | Education Admin | `/admin/facilitators`, `/admin/reports` | Access granted | High |
| RBAC-012 | Facilitators API — list scoped by role | Attendance Facilitator | GET `/api/facilitators` | 200 OK with only Attendance Facilitator records | High |
| RBAC-013 | Facilitators API — unauthenticated | No session | GET `/api/facilitators` | 403 Forbidden | High |
| RBAC-014 | Teachers API — manage restricted | Education Admin or Super Admin | POST `/api/teachers` | 201 Created | High |
| RBAC-015 | Teachers API — forbidden for other roles | Attendance Facilitator | POST `/api/teachers` | 403 Forbidden | High |
| RBAC-016 | Admin users API — Super Admin only | HR Admin | GET `/api/admin-users` | 403 Forbidden | High |
| RBAC-017 | Admin users API — Super Admin allowed | Super Admin | GET `/api/admin-users` | 200 OK (lists HR Admin & Education Admin accounts) | High |
| RBAC-018 | Dynamic permission refresh without re-login | HR Admin | PATCH `/api/facilitators/{id}` `{ canAddStudent: true }` | Facilitator can add students on next action without re-logging in | High |

---

## 6. Student Management

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STU-001 | List all students | GET `/api/students` | 200 OK, array of students (with `photo_data_url` and `qr_code` excluded) | High |
| STU-002 | Filter by grade(s) | GET `/api/students?grade=አንደኛ ክፍል` (repeatable param) | Returns students belonging to specified grade(s) | High |
| STU-003 | Filter by academic year & sex | GET `/api/students?academicYear=2018&sex=Male` | Returns filtered male students in 2018 | High |
| STU-004 | Get by Unique ID (query) | GET `/api/students?uniqueId=BH-2018-001` | 200 OK single student document, or 404 if missing | High |
| STU-005 | Get by Mongo ID or Unique ID (path) | GET `/api/students/BH-2018-001` | 200 OK full student record | High |
| STU-006 | Create student — Super Admin | POST `/api/students` with authentic Amharic data (`First_Name: "አማኑኤል"`, `Father_Name: "ተክሌ"`, `Grade: "አንደኛ ክፍል"`, `Academic_Year: "2018"`, `userRole: "Super Admin"`) | 201 Created, `{ _id }` returned; signed QR generated | High |
| STU-007 | Create student — missing required field | POST omitting one of `Unique_ID`, `First_Name`, `Father_Name`, `Academic_Year`, `Grade` | 400 Bad Request `{ error: "<field> is required" }` | High |
| STU-008 | Concurrency lock on Unique_ID | POST two student creations with same `Unique_ID: "BH-2018-001"` simultaneously | Distributed lock prevents race condition; second request fails gracefully | High |
| STU-009 | Facilitator without permission | POST student as Attendance Facilitator with `canAddStudent: false` | 403 Forbidden `{ code: "ADD_STUDENT_DENIED" }` | High |
| STU-010 | Facilitator with permission | Enable `canAddStudent`; facilitator POSTs student in assigned grade | 201 Created | High |
| STU-011 | Facilitator wrong grade | Facilitator assigned to `አንደኛ ክፍል` attempts to create student in `ስድስተኛ ክፍል` | 403 Forbidden `{ code: "RESTRICTED_GRADE" }` | High |
| STU-012 | Facilitator missing userEmail | POST as Attendance Facilitator without `userEmail` | 403 Forbidden "User email is required..." | Medium |
| STU-013 | Non-admin student creation blocked | POST new student with `userRole: "Teacher"` | 403 Forbidden "You do not have permission to add students." | High |
| STU-014 | Invalid photo format | POST with non-JPEG/PNG `photo_data_url` | 400 "photo_data_url must be a JPG or PNG data URL" | Medium |
| STU-015 | Update student (PUT) | PUT `/api/students/{id}` with updated fields (`Phone_Number: "0911998877"`) | 200 OK, updated student returned | High |
| STU-016 | Regenerate QR on Unique_ID update | PUT changing `Unique_ID` from `BH-2018-001` to `BH-2018-002` | New signed `qr_code` generated automatically | Medium |
| STU-017 | Update student photo (PATCH) | PATCH `/api/students/{id}` with valid PNG base64 data URL | 200 OK, photo updated | Medium |
| STU-018 | Regenerate QR code (PATCH) | PATCH `/api/students/{id}` with `{ "generateQR": true }` | 200 OK, 300px PNG QR data URL regenerated | Medium |
| STU-019 | PATCH with empty/invalid payload | PATCH `/api/students/{id}` with `{}` | 400 `No valid fields to update` | Low |
| STU-020 | Check duplicate — existing match | POST `/api/students/check-duplicate` with matching names (`First_Name: "አማኑኤል"`, `Father_Name: "ተክሌ"`, `Grandfather_Name: "ገብረማርያም"`, `Mothers_Name: "ወለተ ዮሐንስ"`, `Sex: "Male"`) | 200 OK `{ exists: true }` | High |
| STU-021 | Check duplicate — no match | POST `/api/students/check-duplicate` with unique name | 200 OK `{ exists: false }` | High |
| STU-022 | Check duplicate — missing fields | POST `/api/students/check-duplicate` omitting `Mothers_Name` | 400 `Missing required fields` | Medium |
| STU-023 | Count students by grade & year | POST `/api/students/count` `{ "academicYear": "2018", "grade": "አንደኛ ክፍል", "classification": "Regular" }` | 200 OK `{ count, academicYear, grade, classification }` | High |
| STU-024 | Count students — missing params | POST `/api/students/count` without `academicYear` | 400 `Academic year and grade are required` | Medium |
| STU-025 | Total students count | GET `/api/students/total` | 200 OK `{ total: 1250 }` | Low |
| STU-026 | Delete student | DELETE `/api/students` with `{ "id": "{studentId}" }` | 200 OK `{ message: "Student deleted" }` | High |
| STU-027 | Delete student — invalid ID | DELETE `/api/students` with invalid ID | 400 `Valid ID is required` | Medium |
| STU-028 | Classification grade options validation | Verify classification dropdowns (Regular, Extension, SignLanguage, Summer, begena) | Corresponding canonical grade options loaded | High |
| STU-029 | Student details profile view | Open student profile in UI | Personal details, attendance history, academic results, payments visible | High |
| STU-030 | Registration period closed | Set past `registrationClosedDate` for `Regular` 2018 in `/api/category-periods`, then attempt to POST student | 403 Forbidden "Registration is closed for this category..." | High |
| STU-031 | Registration period open | Ensure future `registrationClosedDate`, POST student | 201 Created | Medium |

---

## 7. Attendance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ATT-001 | List attendance by date | GET `/api/attendance?date=2018-05-15` | Records for date returned, newest first | High |
| ATT-002 | Filter attendance by grade & year | GET `/api/attendance?grade=አንደኛ ክፍል&academicYear=2018` | Scoped only to students in specified grade | High |
| ATT-003 | Attendance summary mode | GET `/api/attendance?date=2018-05-15&grade=አንደኛ ክፍል&summary=true` | 200 OK `{ total: 45, present: 42 }` | High |
| ATT-004 | Summary for empty grade | GET `/api/attendance?grade=በገና&summary=true` with no students | 200 OK `{ total: 0, present: 0 }` | Medium |
| ATT-005 | Attendance pagination limit | GET `/api/attendance?limit=10` | Returns at most 10 records | Low |
| ATT-006 | Mark attendance present (bulk) | POST `/api/attendance` with `{ date: "2018-05-15", attendance: [{ studentId, present: true, hasPermission: false }] }` | 200 OK `{ success: true, insertedCount, updatedCount }` | High |
| ATT-007 | Mark absent with permission | POST `/api/attendance` with `present: false, hasPermission: true, reason: "በህመም ምክንያት"` | Stored correctly with permission flag & reason | High |
| ATT-008 | Mark absent without permission | POST `/api/attendance` with `present: false, hasPermission: false, reason: ""` | Stored correctly as unexcused absence | High |
| ATT-009 | Idempotent bulk upsert | Submit attendance for same student and date twice | Second submit updates existing record; `updatedCount` increments | High |
| ATT-010 | Invalid attendance payload | POST `/api/attendance` without `date` or non-array `attendance` | 400 `Invalid request data` | High |
| ATT-011 | Concurrency lock on attendance date | Two facilitators submit attendance for same date simultaneously | Distributed lock `lock:attendance:{date}` serializes writes | Medium |
| ATT-012 | Student attendance history | GET `/api/attendance/{studentId}` with valid student ObjectId | 200 OK array of historical attendance records | Medium |
| ATT-013 | Attendance history invalid ID | GET `/api/attendance/invalid-id` | 400 `Invalid Student ID` | Medium |
| ATT-014 | QR code scanning attendance | Scan valid signed student QR code in facilitator UI | QR verified and student marked present in roster | High |
| ATT-015 | Ethiopian calendar date mode | Test attendance with Ethiopian date picker in `sundays_only` and `all_days` modes | Dates formatted accurately in Ethiopian calendar | Medium |
| ATT-016 | Query draft / temp attendance | GET `/api/attendance/temp?date=2018-05-15&markedBy=Attendance%20Facilitator` | 200 OK draft attendance records | Low |

---

## 8. Facilitators & Education Facilitators

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| FAC-001 | List facilitators by role scope | GET `/api/facilitators` as HR Admin | 200 OK with only Attendance Facilitator records (passwords excluded) | High |
| FAC-002 | Get facilitator by ID | GET `/api/facilitators?id={facilitatorId}` | 200 OK single facilitator document | High |
| FAC-003 | Create Attendance Facilitator | POST `/api/facilitators` with `name: "ዲ/ን ቴዎድሮስ ካሳሁን"`, `email: "facilitator.tewodros@birhanehiwot.org"`, `password: "Facilitator123!"`, `role: "Attendance Facilitator"`, `grade: ["አንደኛ ክፍል"]` | 201 Created with inserted `_id` | High |
| FAC-004 | Create Attendance Facilitator without grade | POST `/api/facilitators` with empty `grade: []` | 400 `Grade is required` | High |
| FAC-005 | Create facilitator duplicate email | POST `/api/facilitators` with existing email | 409 `Email already exists` | High |
| FAC-006 | Update facilitator (PUT) | PUT `/api/facilitators` with updated name and grade assignment | 200 `Updated successfully` | High |
| FAC-007 | Delete facilitator | DELETE `/api/facilitators` with valid ID in requester's scope | 200 `Deleted successfully` | High |
| FAC-008 | Cross-role creation forbidden | HR Admin attempts to create Education Facilitator | 403 `No permission for this role` | High |
| FAC-009 | Toggle canAddStudent permission | PATCH `/api/facilitators/{id}` with `{ "canAddStudent": true }` | 200 OK, `canAddStudent` updated | High |
| FAC-010 | Total facilitators count | GET `/api/facilitators/total` | 200 OK `{ total: count }` | Low |
| FAC-011 | List facilitator role constants | GET `/api/facilitators/roles` | 200 OK `[{ value: "Attendance Facilitator", ... }, { value: "Education Facilitator", ... }]` | Medium |
| FAC-012 | Education Facilitator CRUD | Education Admin creates `መርጌታ ዘርዓይ በርሄ` via `/api/education-facilitators` | 201 Created; full CRUD operational | High |
| FAC-013 | Education Facilitator unauthorized access | Attendance Facilitator calls `/api/education-facilitators` | 403 Forbidden | High |
| FAC-014 | Password exclusion audit | Inspect GET `/api/facilitators` and `/api/education-facilitators` responses | Password field is never returned | High |
| FAC-015 | Facilitator edit form UI | Update grades in HR Facilitators management UI | Updated assigned grades reflected in facilitator view | High |

---

## 9. Teachers, Subjects & Assignments

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TCH-001 | List teachers | GET `/api/teachers` as Education Admin | 200 OK array of teachers (passwords excluded) | High |
| TCH-002 | Create teacher | POST `/api/teachers` with `name: "መምህር አስፋው ወልደሥላሴ"`, `email: "teacher.asfaw@birhanehiwot.org"`, `grade: "አንደኛ ክፍል"`, `assignedSubjects: ["ስርዓተ ቤተክርስቲያን", "ነገረ ሃይማኖት"]` | 201 Created (password defaults to `Teacher123!` if omitted) | High |
| TCH-003 | Create teacher duplicate email | POST `/api/teachers` with existing email | 409 `Email already exists` | High |
| TCH-004 | Update teacher (PUT) | PUT `/api/teachers` with updated assigned subjects | 200 `Updated successfully` | Medium |
| TCH-005 | Delete teacher | DELETE `/api/teachers` with valid ID | 200 `Deleted successfully` | High |
| TCH-006 | Teacher forbidden for unauthorized roles | HR Admin calls `/api/teachers` | 403 Forbidden | High |
| SUB-001 | List grouped subjects | GET `/api/subjects?academicYear=2018&grade=አንደኛ ክፍል` | 200 OK grouped doc `{ academicYear, grade, gradeNumber, subjects[] }` | High |
| SUB-002 | Add subject to grade group | POST `/api/subjects` `{ "name": "ስርዓተ ቤተክርስቲያን", "grade": "አንደኛ ክፍል", "gradeNumber": 1, "academicYear": "2018" }` | 201 Created / Added to group | High |
| SUB-003 | Duplicate subject in grade | POST same subject name for same grade & year | 409 `Subject already exists for this grade and academic year` | Medium |
| SUB-004 | Batch create subjects | POST `/api/subjects/batch` with 6 Orthodox Sunday School subjects (*ነገረ ሃይማኖት*, *የመጽሐፍ ቅዱስ ጥናት*, *ክርስቲያናዊ ስነ ምግባር*, *የቤተክርስቲያን ታሪክ*, *ግዕዝ ቋንቋ*, *መዝሙር*) | 200 OK `{ results, summary: { total: 6, created: 6, exists: 0, errors: 0 } }` | Medium |
| SUB-005 | Batch create empty array | POST `/api/subjects/batch` with `{ "subjects": [] }` | 400 `Subjects array is required and must not be empty` | Medium |
| SUB-006 | Remove subject from group | DELETE `/api/subjects/{groupId}` with `{ "name": "ስርዓተ ቤተክርስቲያን" }` | 200 OK; subject removed from array; group deleted if empty | Medium |
| SUB-007 | Remove subject missing name | DELETE `/api/subjects/{groupId}` with `{}` | 400 `Subject name is required in request body` | Low |
| TAS-001 | List teacher assignments | GET `/api/teacher-assignments` | 200 OK array of assignments with resolved teacher and subject names | Medium |
| TAS-002 | Create teacher assignment | POST `/api/teacher-assignments` with `{ teacherId, subjectId, grade: "አንደኛ ክፍል", academicYear: "2018" }` | 201 Created | Medium |
| TAS-003 | Duplicate teacher assignment | POST same teacher, subject, grade, and year | 409 `Assignment already exists...` | Medium |
| TAS-004 | Delete teacher assignment | DELETE `/api/teacher-assignments/{id}` | 200 `Assignment deleted successfully` | Medium |

---

## 10. Category Periods (Registration Windows)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PER-001 | List all category periods | GET `/api/category-periods` | 200 OK array of category periods sorted by classification | High |
| PER-002 | Filter periods by academic year | GET `/api/category-periods?academicYear=2018` | Returns only periods matching year 2018 | Medium |
| PER-003 | Create or upsert category period | POST `/api/category-periods` with `{ classification: "Regular", academicYear: "2018", startDate: "2018-01-01", endDate: "2018-12-30", registrationClosedDate: "", isActive: true }` | 200 OK upserted period document | High |
| PER-004 | Missing classification or year | POST `/api/category-periods` omitting `classification` | 400 `classification and academicYear are required` | High |
| PER-005 | Closed registration blocks student creation | Set `registrationClosedDate` to a past date; attempt to POST student in that classification & year | 403 Forbidden "Registration is closed for this category..." | High |

---

## 11. Student Results

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RES-001 | List all student results | GET `/api/student-results` | 200 OK array of all student exam results | High |
| RES-002 | Filter results by student | GET `/api/student-results?studentId={studentId}` | Returns results for specified student only | High |
| RES-003 | Create student result | POST `/api/student-results` with `{ studentId, studentName: "አማኑኤል ተክሌ ገብረማርያም", subjectId, subjectName: "ስርዓተ ቤተክርስቲያን", academicYear: "2018", assignment1: 9, assignment2: 10, midTest: 28, finalExam: 48, remarks: "እጅግ በጣም ጥሩ ውጤት" }` | 201 Created; server calculates `totalScore: 95`, `average: 95`, `grade: "A+"`, and `recordedDate` | High |
| RES-004 | Missing required result fields | POST `/api/student-results` without `subjectId` | 400 `Missing required fields: studentId, subjectId, academicYear` | High |
| RES-005 | Duplicate student/subject/year result | POST result for student and subject that already has scores in 2018 | 409 `Result already exists for this student/subject/year` | High |
| RES-006 | Letter grade threshold A+ (≥ 90) | Total score = 90 | Letter grade = `"A+"` | Medium |
| RES-007 | Letter grade threshold B (70–74) | Total score = 72 | Letter grade = `"B"` | Medium |
| RES-008 | Letter grade threshold D (45–49) | Total score = 47 | Letter grade = `"D"` | Medium |
| RES-009 | Letter grade threshold F (< 45) | Total score = 40 | Letter grade = `"F"` | Medium |
| RES-010 | Get student result by ID | GET `/api/student-results/{id}` | 200 OK result document, or 404 if not found | Medium |
| RES-011 | Update result (PUT) | PUT `/api/student-results/{id}` with new scores | 200 OK; `totalScore` and letter `grade` recalculated automatically | High |
| RES-012 | Delete student result | DELETE `/api/student-results/{id}` | 200 `Result deleted successfully` | Medium |
| RES-013 | UI — Student results grade report | Open student profile → Results tab | All enrolled subject scores and computed grades displayed | High |

---

## 12. Payments (13 Ethiopian Months)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PAY-001 | Lazy initialization for new student | GET `/api/payment?year=2018&studentId={studentId}` for a newly created student | 200 OK; all 13 Ethiopian months (*Meskerem* through *Pagumē*) initialized to `"Not Paid"` | High |
| PAY-002 | Missing payment query params | GET `/api/payment` without `year` or `studentId` | 400 `Year and studentId are required` | High |
| PAY-003 | Save monthly payment status | POST `/api/payment` with `{ year: "2018", studentId: "{studentId}", data: { "Meskerem": { "status": "Paid", "amount": "500" }, "Tikimt": { "status": "Paid", "amount": "500" } } }` | 200 OK `Saved successfully` | High |
| PAY-004 | Partial payload preservation | POST update with only *Hidar* paid | Other months remain unaffected (normalized against `ETHIOPIAN_MONTHS`) | Medium |
| PAY-005 | Invalid payment body | POST `/api/payment` with non-object `data` | 400 `Invalid request` | Medium |
| PAY-006 | UI payment toggle | In Student profile → Payment tab, toggle *Tahsas* to Paid with amount `500 ETB` | Payment status saved and persists across reloads | High |
| PAY-007 | UI payment revert | Revert *Tahsas* to Not Paid | Status updated and reflected in UI | Medium |
| PAY-008 | Legacy payment lookup route | GET `/api/students/{studentId}/payments` | 200 OK array of payment records | Medium |

---

## 13. Student Requests Approval Workflow

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REQ-001 | Submit student registration request | Facilitator POSTs to `/api/student-requests` with full `studentData`, `requestedBy: "Attendance Facilitator"`, `requestedByName: "ዲ/ን ቴዎድሮስ ካሳሁን"` | 201 Created with `{ _id }`; status saved as `pending` | High |
| REQ-002 | Submit request missing studentData | POST `/api/student-requests` without `studentData` | 400 `studentData is required` | High |
| REQ-003 | List pending student requests | GET `/api/student-requests?status=pending` | 200 OK array of pending requests | High |
| REQ-004 | Get student request by ID | GET `/api/student-requests/{id}` | 200 OK full request document | High |
| REQ-005 | Approve student request | Super Admin PATCHes `/api/student-requests` with `{ id, status: "approved", approvedBy: "Super Admin" }` | 200 `Request updated`; `processedAt` timestamp set | High |
| REQ-006 | Reject student request with reason | Super Admin PATCHes with `{ id, status: "rejected", approvedBy: "Super Admin", rejectionReason: "መረጃው ያልተሟላ ነው" }` | 200 `Request updated`; rejection reason stored | High |
| REQ-007 | Patch invalid request ID | PATCH `/api/student-requests` with invalid ID | 400 `Valid ID is required` | Medium |
| REQ-008 | Patch unknown request ID | PATCH `/api/student-requests` with non-existent ObjectId | 404 `Request not found` | Medium |
| REQ-009 | UI — Facilitator request submission | Fill new student request modal as facilitator | Request appears in Super Admin pending approval list | High |
| REQ-010 | UI — Admin request approval | Super Admin approves request in dashboard | Student record created in active roster | High |

---

## 14. QR Code Generation & Verification

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| QR-001 | QR generated on student creation | Create student when `QR_SECRET` is configured | Signed `qr_code` data URL generated and stored | High |
| QR-002 | Graceful fallback when QR_SECRET missing | Create student without `QR_SECRET` | Student created successfully (201); `qr_code` omitted without failing creation | Medium |
| QR-003 | Verify authentic signed QR text | POST `/api/qr/verify` with `{ text: "<signed_qr_text>" }` | 200 OK `{ uniqueId: "BH-2018-001" }` | High |
| QR-004 | Verify tampered QR text | POST `/api/qr/verify` with modified QR payload | 400 Bad Request `Invalid QR code` with reason code | High |
| QR-005 | Verify empty QR text | POST `/api/qr/verify` with `{ text: "" }` | 400 `text is required` | Medium |
| QR-006 | Stream student QR image PNG | GET `/api/students/{id}/qr` | 200 OK with `Content-Type: image/png` binary stream | High |

---

## 15. Reports & Export

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RPT-001 | Admin general reports page | Super Admin navigates to `/admin/reports` | Summary cards, attendance statistics, and grade charts render | Medium |
| RPT-002 | HR reports page | HR Admin navigates to `/hr/reports` | Attendance rate and facilitator logs visible | Medium |
| RPT-003 | Education reports page | Education Admin navigates to `/education/reports` | Academic scores, grade distribution, and teacher assignments visible | Medium |
| RPT-004 | Facilitator scoped reports | Attendance Facilitator navigates to reports | Only assigned grade attendance figures displayed | Medium |
| RPT-005 | Export Excel attendance report | Click Export Excel on attendance report table | Downloads valid `.xlsx` spreadsheet matching Ethiopian date range | Medium |
| RPT-006 | Export PDF student results report | Click Export PDF on results / attendance table | Downloads formatted PDF document | Medium |
| RPT-007 | Filter reports by Ethiopian date range | Select start & end dates in Ethiopian calendar picker | Data filtered precisely to selected period | Medium |
| RPT-008 | Filter reports by classification & grade | Select `Regular` and `አንደኛ ክፍል` | Reports scoped strictly to chosen class and grade | Medium |

---

## 16. Negative & Security Edge Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NEG-001 | Malformed MongoDB ObjectId | Pass `12345` to any `[id]` route | 400 Bad Request with descriptive invalid ID message | Medium |
| NEG-002 | Non-existent resource ID | Pass valid 24-char ObjectId not in database | 404 Not Found error | Medium |
| NEG-003 | NoSQL injection in login/queries | Submit `{"$gt": ""}` in email or parameters | Sanitized safely via regex escaping; auth fails securely | High |
| NEG-004 | XSS injection in Amharic student name | Submit `<script>alert('xss')</script>` in `First_Name` | Stored safely; escaped properly in React UI rendering | High |
| NEG-005 | Oversized base64 photo upload | Submit image > 5MB | Handled gracefully with client/server validation | Low |
| NEG-006 | Distributed lock degradation | Redis server offline | Concurrency wrapper gracefully falls back; operations still complete | Medium |
| NEG-007 | Missing Content-Type header | POST JSON body without `Content-Type: application/json` | Handled gracefully with 400 Bad Request | Low |
| NEG-008 | Role tampering in request body | Send `userRole: "Super Admin"` as an unauthenticated or facilitator user | Role-checked endpoints verify NextAuth JWT server-side, ignoring body claim | High |

---

## 17. Test Execution Checklist

### Prerequisites
- [ ] MongoDB connection verified (`MONGODB_URI` active)
- [ ] `NEXTAUTH_SECRET` and optional `QR_SECRET` configured in `.env.local`
- [ ] Next.js server running (`npm run dev` or production URL)
- [ ] Postman collection & environment imported
- [ ] Super Admin initialized via `POST /api/setup/super-admin`

### Smoke Test (15 minutes)
1. [ ] **AUTH-012 & AUTH-001**: Setup and log in as Super Admin (`superadmin@birhanehiwot.org`)
2. [ ] **MOB-001**: Verify mobile app login (`POST /api/mobile/auth`)
3. [ ] **STU-006**: Register a student (`BH-2018-001` - አማኑኤል ተክሌ)
4. [ ] **ATT-006**: Mark attendance for the student
5. [ ] **ATT-003**: Verify attendance summary returns accurate count
6. [ ] **FAC-003**: Create Attendance Facilitator (`ዲ/ን ቴዎድሮስ ካሳሁን`)
7. [ ] **SUB-002**: Add subject `ስርዓተ ቤተክርስቲያን` for `አንደኛ ክፍል`
8. [ ] **RES-003**: Record exam score and verify university letter grade `A+`
9. [ ] **PAY-003**: Mark *Meskerem* payment status as Paid (500 ETB)
10. [ ] **AUTH-008**: Log out successfully

---

## 18. API Endpoint Reference Table

| Method | Endpoint | Description | Auth / RBAC |
|--------|----------|-------------|-------------|
| GET | `/api/auth/csrf` | Get CSRF token | Public |
| POST | `/api/auth/callback/credentials` | Web credentials login | Public |
| GET | `/api/auth/session` | Get active session | Session Cookie |
| POST | `/api/auth/signout` | Web logout | Public |
| POST | `/api/mobile/auth` | Mobile JWT login | Public |
| OPTIONS | `/api/mobile/auth` | Mobile CORS preflight | Public |
| POST | `/api/setup/super-admin` | Bootstrap Super Admin | Public (one-time) |
| GET, POST, DELETE | `/api/students` | List, create, & delete students | Session Cookie / Role rules |
| GET, PUT, PATCH | `/api/students/[studentId]` | Profile, photo & QR update | Session Cookie |
| POST | `/api/students/check-duplicate` | Name+Sex duplicate check | Session Cookie |
| POST | `/api/students/count` | Count by grade & year | Session Cookie |
| GET | `/api/students/total` | Total student count | Session Cookie |
| GET | `/api/students/[studentId]/qr` | Stream student QR PNG image | Public / Session Cookie |
| GET | `/api/students/[studentId]/payments` | Legacy payments history | Session Cookie |
| GET, POST | `/api/attendance` | List attendance & bulk upsert | Session Cookie |
| GET | `/api/attendance/[studentId]` | Student attendance history | Session Cookie |
| GET | `/api/attendance/temp` | Temporary / draft attendance | Session Cookie |
| GET | `/api/facilitators/roles` | Facilitator roles list | Public / Session Cookie |
| GET, POST, PUT, DELETE | `/api/facilitators` | Manage facilitators | Super Admin / HR Admin |
| PATCH | `/api/facilitators/[id]` | Toggle `canAddStudent` | HR Admin / Super Admin |
| GET | `/api/facilitators/total` | Total facilitators count | Session Cookie |
| GET, POST, PUT, DELETE | `/api/education-facilitators` | Education facilitators | Education Admin / Super Admin |
| GET, POST, PUT, DELETE | `/api/teachers` | Teacher profile management | Education Admin / Super Admin |
| GET, POST | `/api/subjects` | Grouped subjects list & add | Session Cookie |
| POST | `/api/subjects/batch` | Batch create subjects | Session Cookie |
| DELETE | `/api/subjects/[id]` | Remove subject from group | Session Cookie |
| GET, POST | `/api/teacher-assignments` | Teacher-subject mappings | Session Cookie |
| DELETE | `/api/teacher-assignments/[id]` | Remove assignment | Session Cookie |
| GET, POST | `/api/category-periods` | Registration windows | Super Admin |
| GET, POST | `/api/student-results` | Student exam results | Education Admin / Facilitator |
| GET, PUT, DELETE | `/api/student-results/[id]` | Result document by ID | Education Admin / Facilitator |
| GET, POST, PATCH | `/api/student-requests` | Student request workflow | Facilitators & Super Admin |
| GET | `/api/student-requests/[id]` | Get student request by ID | Session Cookie |
| GET, POST | `/api/payment` | 13-Month Ethiopian payments | Session Cookie |
| GET, POST, PUT, DELETE | `/api/admin-users` | Department admins | Super Admin only |
| POST | `/api/qr/verify` | HMAC QR code verification | Public / Session Cookie |
| GET | `/api/sheet/health` | Google Sheets health check | Session Cookie |
| GET | `/api/sheet` | Fetch Google Sheets rows | Session Cookie |
| GET | `/api/cron/aggregate-attendance` | Aggregate attendance cron | Internal / Admin |
