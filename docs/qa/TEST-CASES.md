# Birhane Hiwot Sunday School — QA Test Case Document

**Application:** Birhane Hiwot Sunday School Attendance Management System  
**Version:** 0.1.0  
**Last updated:** August 24, 2026  
**Related assets:** `docs/qa/Birhane-Hiwot-API.postman_collection.json`, `docs/qa/Birhane-Hiwot.postman_environment.json`

---

## 1. Test Scope

| In scope | Out of scope |
|----------|--------------|
| Authentication & session management | Third-party Google Sheets sync reliability (unless configured) |
| Role-based page access (middleware) | Load/performance benchmarking |
| Student CRUD & registration workflow | Mobile native apps |
| Attendance marking & reporting | Penetration testing |
| Facilitator & admin user management | |
| Teacher, subject & assignment management | |
| Student results & grading | |
| Payment status tracking | |
| Student request approval flow | |
| QR code generation & verification | |
| REST API endpoints | |

---

## 2. Test Environment

| Item | Value |
|------|-------|
| Base URL (local) | `http://localhost:3000` |
| Base URL (staging) | _Set before test run_ |
| Database | MongoDB |
| Auth | NextAuth (Credentials, JWT session, 24h expiry) |
| Calendar | Ethiopian calendar for dates & academic year |

### Test Accounts Required

| Role | Purpose |
|------|---------|
| Super Admin | Full system access |
| HR Admin | HR module, attendance facilitators, limited admin routes |
| Education Admin | Education module, teachers, subjects |
| Attendance Facilitator | Mark attendance, optional student creation |
| Education Facilitator | Results & education reports |
| Teacher | Subject/grade assignment (if UI enabled) |

---

## 3. Test Case Summary

| Module | Total Cases | Priority High |
|--------|-------------|---------------|
| Authentication | 12 | 10 |
| Authorization / RBAC | 18 | 16 |
| Students | 28 | 20 |
| Attendance | 16 | 14 |
| Facilitators | 14 | 10 |
| Teachers & Subjects | 16 | 10 |
| Results | 12 | 8 |
| Payments | 8 | 6 |
| Student Requests | 10 | 8 |
| QR Code | 6 | 5 |
| Reports & Export | 8 | 4 |
| **Total** | **148** | **111** |

---

## 4. Authentication & Session

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-001 | Valid login | Enter valid email/password on `/login`, submit | Redirect to role dashboard; session cookie set | High |
| AUTH-002 | Invalid password | Enter valid email, wrong password | Error message; remain on login page | High |
| AUTH-003 | Invalid email | Enter non-existent email | Error message; no session created | High |
| AUTH-004 | Empty fields | Submit with blank email or password | Validation prevents submit or shows error | High |
| AUTH-005 | Case-insensitive email | Login with different email casing than stored | Login succeeds | Medium |
| AUTH-006 | Session persistence | Login, refresh page | User remains authenticated | High |
| AUTH-007 | Session expiry | Wait 24h or invalidate token | User redirected to login | Medium |
| AUTH-008 | Logout | Click logout | Session cleared; redirected to login | High |
| AUTH-009 | Protected route without auth | Visit `/admin/dashboard` without login | Redirect to `/login` | High |
| AUTH-010 | API session check | GET `/api/auth/session` after login | Returns user id, email, role | Medium |
| AUTH-011 | CSRF token flow | GET `/api/auth/csrf` then login via credentials callback | Login succeeds with valid CSRF | Medium |
| AUTH-012 | Super Admin setup (one-time) | POST `/api/setup/super-admin` with `confirm: CREATE_SUPER_ADMIN` | Creates Super Admin if none exists | High |

---

## 5. Authorization (Role-Based Access)

| ID | Test Case | Role | Route / Action | Expected Result | Priority |
|----|-----------|------|----------------|-----------------|----------|
| RBAC-001 | Super Admin full access | Super Admin | `/super-admin/*` | Access granted | High |
| RBAC-002 | Non-super blocked from super-admin | HR Admin | `/super-admin/dashboard` | Access denied / redirect | High |
| RBAC-003 | HR Admin HR module | HR Admin | `/hr/*` | Access granted | High |
| RBAC-004 | HR Admin blocked from education | HR Admin | `/education/*` | Access denied | High |
| RBAC-005 | Education Admin education module | Education Admin | `/education/*` | Access granted | High |
| RBAC-006 | Attendance Facilitator attendance | Attendance Facilitator | `/facilitator/attendance/*` | Access granted | High |
| RBAC-007 | Attendance Facilitator results blocked | Attendance Facilitator | `/facilitator/results/*` | Access denied | High |
| RBAC-008 | Education Facilitator results | Education Facilitator | `/facilitator/results/*` | Access granted | High |
| RBAC-009 | HR Admin limited admin routes | HR Admin | `/admin/students`, `/admin/facilitators`, `/admin/reports` | Access granted | High |
| RBAC-010 | HR Admin blocked from other admin | HR Admin | `/admin/dashboard` (if restricted) | Access denied | Medium |
| RBAC-011 | Education Admin limited admin | Education Admin | `/admin/facilitators`, `/admin/reports` | Access granted | High |
| RBAC-012 | Facilitators API — list | Super Admin / HR Admin | GET `/api/facilitators` | 200 with facilitator list | High |
| RBAC-013 | Facilitators API — forbidden | Unauthenticated / wrong role | GET `/api/facilitators` | 403 Forbidden | High |
| RBAC-014 | Teachers API — manage | Education Admin | POST `/api/teachers` | 201 Created | High |
| RBAC-015 | Teachers API — forbidden | Attendance Facilitator | POST `/api/teachers` | 403 Forbidden | High |
| RBAC-016 | Admin users — Super Admin only | HR Admin | GET `/api/admin-users` | 403 Forbidden | High |
| RBAC-017 | Admin users — Super Admin only | Super Admin | GET `/api/admin-users` | 200 OK | High |
| RBAC-018 | Permission refresh without re-login | HR toggles `canAddStudent` | Facilitator session still active | Updated permission reflected in session | Medium |

---

## 6. Student Management

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STU-001 | List all students | GET `/api/students` | Returns array of students (no photo/qr in list) | High |
| STU-002 | Filter by grade | GET `/api/students?grade=አንደኛ ክፍል` | Only matching grade returned | High |
| STU-003 | Filter by academic year | GET `/api/students?academicYear=2018` | Filtered results | High |
| STU-004 | Get by Unique ID | GET `/api/students?uniqueId=BH-001` | Single student or 404 | High |
| STU-005 | Get by Mongo ID | GET `/api/students/{id}` | Full student record | High |
| STU-006 | Create student — Super Admin | POST with required fields + `userRole: Super Admin` | 201, `_id` returned, QR generated if configured | High |
| STU-007 | Create student — missing required field | Omit `Unique_ID` | 400 with field name in error | High |
| STU-008 | Create duplicate Unique_ID | POST same `Unique_ID` twice | Second request handled (lock prevents duplicate) | High |
| STU-009 | Facilitator without permission | POST as Attendance Facilitator, `canAddStudent: false` | 403 `ADD_STUDENT_DENIED` | High |
| STU-010 | Facilitator with permission | HR enables `canAddStudent`, facilitator creates student | 201 Created | High |
| STU-011 | Facilitator wrong grade | Create student for unassigned grade | 403 `RESTRICTED_GRADE` | High |
| STU-012 | Invalid photo format | POST with non-image `photo_data_url` | 400 validation error | Medium |
| STU-013 | Update student (PUT) | PUT `/api/students/{id}` with changed phone | 200, fields updated | High |
| STU-014 | Regenerate QR on Unique_ID change | Change `Unique_ID` via PUT | New QR code generated | Medium |
| STU-015 | Update photo (PATCH) | PATCH with valid JPEG data URL | Photo updated | Medium |
| STU-016 | Generate QR (PATCH) | PATCH with `generateQR: true` | QR data URL in response | Medium |
| STU-017 | Check duplicate — exists | POST `/api/students/check-duplicate` with matching identity | `{ exists: true }` | High |
| STU-018 | Check duplicate — not exists | POST with new identity | `{ exists: false }` | High |
| STU-019 | Check duplicate — missing fields | Omit `Sex` | 400 error | Medium |
| STU-020 | Delete student | DELETE `/api/students` with valid `id` | 200, student removed | High |
| STU-021 | Delete invalid ID | DELETE with bad ObjectId | 400 error | Medium |
| STU-022 | Student form — Regular classification | UI: select Regular, fill all sections | Grade options show standard grades | High |
| STU-023 | Student form — Extension classification | Select Extension | Shows Level 1 / Level 2 grades | Medium |
| STU-024 | Student form — Sign Language | Select Sign Language | Shows sign language grade option | Medium |
| STU-025 | Student form — Summer | Select Summer | Shows Grade 7 morning/afternoon options | Medium |
| STU-026 | Student details view | Open student profile page | All personal, academic, attendance tabs visible | High |
| STU-027 | Student count by grades | POST `/api/students/count` | Correct count for grade + year | Medium |
| STU-028 | Total students endpoint | GET `/api/students/total` | Returns total count | Low |

---

## 7. Attendance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ATT-001 | List attendance by date | GET `/api/attendance?date=YYYY-MM-DD` | Attendance records for date | High |
| ATT-002 | Filter by grade | GET with `grade` + `academicYear` | Only students in that grade | High |
| ATT-003 | Attendance summary | GET with `summary=true` | `{ total, present }` counts | High |
| ATT-004 | Mark present | POST bulk attendance with `present: true` | 200, upsert success | High |
| ATT-005 | Mark absent with permission | POST with `present: false, hasPermission: true, reason` | Saved correctly | High |
| ATT-006 | Mark absent without permission | POST with `present: false, hasPermission: false` | Saved correctly | High |
| ATT-007 | Idempotent re-submit | POST same date/student twice | Updates existing row, no duplicate | High |
| ATT-008 | Invalid payload | POST without `date` or `attendance` array | 400 error | High |
| ATT-009 | Student attendance history | GET `/api/attendance/{studentId}` | History for student | Medium |
| ATT-010 | UI — mark all present | Use "Mark All Present" in attendance UI | All students marked present | High |
| ATT-011 | UI — QR scan attendance | Scan valid student QR | Student marked present | High |
| ATT-012 | UI — invalid QR | Scan tampered/invalid QR | Error shown, no attendance marked | High |
| ATT-013 | UI — date picker (Ethiopian) | Select Ethiopian date | Correct Gregorian mapping used | Medium |
| ATT-014 | UI — Sundays only mode | Set `ATTENDANCE_CALENDAR_MODE` to `sundays_only` | Non-Sunday dates disabled | Medium |
| ATT-015 | Temp attendance endpoint | GET `/api/attendance/temp` | Returns draft/temp data | Low |
| ATT-016 | Export attendance report | Generate Excel/PDF from reports page | File downloads with correct data | Medium |

---

## 8. Facilitators

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| FAC-001 | List facilitators | GET `/api/facilitators` (authenticated, authorized) | List without passwords | High |
| FAC-002 | Get facilitator by ID | GET `/api/facilitators?id={id}` | Single record | High |
| FAC-003 | Create Attendance Facilitator | POST with name, email, password, role, grade | 201 Created | High |
| FAC-004 | Create without grade | POST Attendance Facilitator without grade | 400 "Grade is required" | High |
| FAC-005 | Duplicate email | POST with existing email | 409 Conflict | High |
| FAC-006 | Update facilitator | PUT with changed name/grade | 200 Updated | High |
| FAC-007 | Delete facilitator | DELETE with valid id | 200 Deleted | High |
| FAC-008 | HR Admin creates attendance facilitator only | HR Admin POST Education Facilitator | 403 No permission | High |
| FAC-009 | Toggle canAddStudent | PATCH `/api/facilitators/{id}` `{ canAddStudent: true }` | Field updated | High |
| FAC-010 | Education facilitator CRUD | Use `/api/education-facilitators` as Education Admin | CRUD succeeds | High |
| FAC-011 | Education facilitator — forbidden | Attendance Facilitator calls education-facilitators API | 403 Forbidden | Medium |
| FAC-012 | UI — add facilitator form | Fill add facilitator page | Facilitator appears in list | High |
| FAC-013 | UI — edit facilitator | Edit name/email/grade | Changes saved | High |
| FAC-014 | Total facilitators count | GET `/api/facilitators/total` | Returns count | Low |

---

## 9. Teachers, Subjects & Assignments

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TCH-001 | List teachers | GET `/api/teachers` as Education Admin | Teacher list returned | High |
| TCH-002 | Create teacher | POST with email (password optional, defaults) | 201 Created | High |
| TCH-003 | Update teacher | PUT with new assignedSubjects | 200 Updated | Medium |
| TCH-004 | Delete teacher | DELETE with valid id | 200 Deleted | High |
| TCH-005 | List subjects | GET `/api/subjects?academicYear&grade` | Subject groups returned | High |
| TCH-006 | Add subject to group | POST `/api/subjects` with name, grade, year | 201, subject added to group | High |
| TCH-007 | Duplicate subject | POST same subject for same grade/year | 409 Conflict | Medium |
| TCH-008 | Batch add subjects | POST `/api/subjects/batch` | Multiple subjects created | Medium |
| TCH-009 | Delete subject group | DELETE `/api/subjects/{id}` | Group removed | Medium |
| TCH-010 | List teacher assignments | GET `/api/teacher-assignments` | Assignments list | Medium |
| TCH-011 | Create assignment | POST with teacherId, subjectId, grade, year | 201 Created | Medium |
| TCH-012 | Duplicate assignment | POST same teacher/subject/grade/year | 409 Conflict | Medium |
| TCH-013 | Delete assignment | DELETE `/api/teacher-assignments/{id}` | Assignment removed | Medium |
| TCH-014 | UI — manage teachers page | Add/edit teacher in education module | Changes reflected | High |
| TCH-015 | UI — subjects page | Add subjects for grade/year | Subjects appear in list | High |
| TCH-016 | UI — teacher attendance | Mark teacher attendance in education module | Record saved | Medium |

---

## 10. Student Results

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RES-001 | List all results | GET `/api/student-results` | Results array | High |
| RES-002 | Filter by student | GET `?studentId={id}` | Student's results only | High |
| RES-003 | Create result | POST with scores (A1, A2, mid, final) | 201, total & letter grade calculated | High |
| RES-004 | Duplicate result | POST same student/subject/year | 409 Conflict | High |
| RES-005 | Grade calculation A+ | Total score ≥ 90 | Grade = "A+" | Medium |
| RES-006 | Grade calculation F | Total score < 45 | Grade = "F" | Medium |
| RES-007 | Update result | PUT `/api/student-results/{id}` | Scores & grade recalculated | High |
| RES-008 | Delete result | DELETE `/api/student-results/{id}` | Result removed | Medium |
| RES-009 | UI — enter results | Fill results form in education/facilitator module | Result saved & displayed | High |
| RES-010 | UI — results tab on student | Open student profile → Results tab | Results listed per subject | High |
| RES-011 | UI — export results report | Export from reports page | PDF/Excel generated | Medium |
| RES-012 | Missing required fields | POST without studentId | 400 error | High |

---

## 11. Payments

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PAY-001 | Get payment status — new student | GET `/api/payment?year&studentId` | All Ethiopian months initialized "Not Paid" | High |
| PAY-002 | Get payment — missing params | GET without year or studentId | 400 error | High |
| PAY-003 | Save payment status | POST with month data (Paid + amount) | 200 Saved | High |
| PAY-004 | Partial month data | POST with only some months | Other months normalized to Not Paid | Medium |
| PAY-005 | UI — payment tab | Open student → Payment Status tab | Monthly grid displayed | High |
| PAY-006 | UI — mark month paid | Toggle month to Paid, enter amount, save | Status persisted on reload | High |
| PAY-007 | UI — mark month not paid | Change Paid back to Not Paid | Status updated | Medium |
| PAY-008 | Get student payments route | GET `/api/students/{id}/payments` | Payment history returned | Medium |

---

## 12. Student Requests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| REQ-001 | Submit request | POST `/api/student-requests` with studentData | 201, status = pending | High |
| REQ-002 | List pending requests | GET `?status=pending` | Pending requests only | High |
| REQ-003 | Get request by ID | GET `/api/student-requests/{id}` | Full request detail | High |
| REQ-004 | Approve request | PATCH with status=approved | Status updated | High |
| REQ-005 | Reject request | PATCH with status=rejected + reason | Status & reason saved | High |
| REQ-006 | Invalid request ID | PATCH with bad id | 400/404 error | Medium |
| REQ-007 | UI — submit as facilitator | Facilitator submits new student request | Appears in admin pending list | High |
| REQ-008 | UI — approve from admin | Super Admin approves request | Student created or request marked approved | High |
| REQ-009 | UI — reject from admin | Admin rejects with reason | Request marked rejected | High |
| REQ-010 | Missing studentData | POST without studentData | 400 error | High |

---

## 13. QR Code

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| QR-001 | QR generated on student create | Create student with QR_SECRET configured | `qr_code` field populated | High |
| QR-002 | QR without QR_SECRET | Create student without secret | Student created, QR may be absent | Medium |
| QR-003 | Verify valid QR | POST `/api/qr/verify` with signed text | `{ uniqueId }` returned | High |
| QR-004 | Verify invalid QR | POST with tampered text | 400 Invalid QR code | High |
| QR-005 | Verify empty text | POST with empty `text` | 400 text is required | Medium |
| QR-006 | UI — display QR on profile | View student with QR | QR image renders, scannable | High |

---

## 14. Reports & Export

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RPT-001 | Admin reports page | Super Admin → Reports | Page loads with filters | Medium |
| RPT-002 | HR reports page | HR Admin → Reports | Attendance stats visible | Medium |
| RPT-003 | Education reports | Education Admin → Reports | Education data visible | Medium |
| RPT-004 | Facilitator attendance reports | Attendance Facilitator → Reports | Grade-scoped data | Medium |
| RPT-005 | Export Excel — attendance | Click export on attendance report | Valid .xlsx file | Medium |
| RPT-006 | Export PDF — attendance | Click PDF export | Valid PDF file | Medium |
| RPT-007 | Filter reports by date range | Set start/end Ethiopian dates | Data filtered correctly | Medium |
| RPT-008 | Filter reports by grade | Select specific grade | Only that grade's data | Medium |

---

## 15. Negative & Edge Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NEG-001 | Invalid MongoDB ObjectId | Use malformed ID in URL | 400 Invalid ID | Medium |
| NEG-002 | Non-existent resource | GET student/result with valid but missing ID | 404 Not Found | Medium |
| NEG-003 | SQL/NoSQL injection in email | Login with `' OR 1=1 --` | Login fails safely | High |
| NEG-004 | XSS in student name | Create student with `<script>` in name | Stored safely, rendered escaped in UI | High |
| NEG-005 | Large payload — photo | Upload very large base64 photo | Graceful error or size limit | Low |
| NEG-006 | Concurrent attendance submit | Two facilitators submit same date simultaneously | No duplicate rows (distributed lock) | Medium |
| NEG-007 | Concurrent student create | Two creates with same Unique_ID | Only one succeeds | Medium |
| NEG-008 | API without Content-Type | POST JSON without header | Handled gracefully | Low |

---

## 16. Test Execution Checklist

### Pre-requisites
- [ ] MongoDB running and seeded (or empty for setup flow)
- [ ] Environment variables set (`MONGODB_URI`, `NEXTAUTH_SECRET`, optional `QR_SECRET`)
- [ ] Application running (`npm run dev` or deployed staging URL)
- [ ] Postman collection & environment imported
- [ ] Test accounts created for all roles

### Smoke Test (15 min)
1. [ ] AUTH-001 — Login as Super Admin
2. [ ] STU-006 — Create a test student
3. [ ] ATT-004 — Mark attendance for that student
4. [ ] ATT-003 — Verify attendance summary
5. [ ] FAC-003 — Create a test facilitator
6. [ ] AUTH-008 — Logout

### Regression Test (Full)
Run all **High** priority cases across modules. Record pass/fail in the test log below.

---

## 17. Test Log Template

| Date | Tester | Build/Commit | Module | Case ID | Result (Pass/Fail/Blocked) | Notes / Bug ID |
|------|--------|--------------|--------|---------|----------------------------|----------------|
| | | | | | | |

---

## 18. Defect Severity Guidelines

| Severity | Definition | Example |
|----------|------------|---------|
| Critical | System unusable, data loss, security breach | Cannot login; attendance data deleted |
| High | Major feature broken, no workaround | Cannot create students; wrong RBAC access |
| Medium | Feature partially broken, workaround exists | Export missing one column; UI layout issue |
| Low | Cosmetic or minor inconvenience | Typo in label; slow load on one page |

---

## 19. Postman Collection Usage

1. Import `Birhane-Hiwot-API.postman_collection.json` and `Birhane-Hiwot.postman_environment.json`.
2. Set `baseUrl` and credentials in the environment.
3. Run **Auth → Get CSRF Token**, then **Auth → Login (Credentials)**.
4. Execute module folders in order: Setup → Students → Attendance → etc.
5. Collection scripts auto-save `studentId`, `facilitatorId`, `teacherId`, `resultId` to environment variables after create requests.

### Suggested Newman CLI Run

```bash
newman run docs/qa/Birhane-Hiwot-API.postman_collection.json \
  -e docs/qa/Birhane-Hiwot.postman_environment.json \
  --folder "Auth" \
  --folder "Students" \
  --folder "Attendance"
```

---

## 20. Appendix — API Endpoint Reference

| Method | Endpoint | Auth / Role Notes |
|--------|----------|-------------------|
| GET/POST | `/api/auth/*` | NextAuth handlers |
| POST | `/api/setup/super-admin` | One-time setup |
| GET/POST/DELETE | `/api/students` | Role checks on POST |
| GET/PUT/PATCH | `/api/students/[id]` | — |
| POST | `/api/students/check-duplicate` | — |
| POST | `/api/students/count` | — |
| GET | `/api/students/total` | — |
| GET | `/api/students/[id]/qr` | — |
| GET | `/api/students/[id]/payments` | — |
| GET/POST | `/api/attendance` | — |
| GET | `/api/attendance/[studentId]` | — |
| GET | `/api/attendance/temp` | — |
| GET/POST/PUT/DELETE | `/api/facilitators` | JWT role required |
| PATCH | `/api/facilitators/[id]` | canAddStudent toggle |
| GET | `/api/facilitators/total` | — |
| GET/POST/PUT/DELETE | `/api/education-facilitators` | Education Admin / Super Admin |
| GET/POST/PUT/DELETE | `/api/teachers` | Education Admin / Super Admin |
| GET/POST | `/api/subjects` | — |
| POST | `/api/subjects/batch` | — |
| DELETE | `/api/subjects/[id]` | — |
| GET/POST | `/api/teacher-assignments` | — |
| DELETE | `/api/teacher-assignments/[id]` | — |
| GET/POST | `/api/student-results` | — |
| GET/PUT/DELETE | `/api/student-results/[id]` | — |
| GET/POST/PATCH | `/api/student-requests` | — |
| GET | `/api/student-requests/[id]` | — |
| GET/POST | `/api/payment` | — |
| GET/POST/PUT/DELETE | `/api/admin-users` | Super Admin only |
| POST | `/api/qr/verify` | — |
| GET | `/api/sheet/health` | — |
| GET | `/api/sheet` | — |
| GET | `/api/cron/aggregate-attendance` | Cron job |

---

*Document maintained by QA team. Update when new features or API routes are added.*
