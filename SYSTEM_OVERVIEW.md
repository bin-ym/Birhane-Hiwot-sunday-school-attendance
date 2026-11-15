# Birhane Hiwot Sunday School - System Overview

## 1. Project Overview
This system is a comprehensive web-based portal designed to manage the Birhane Hiwot Sunday School. It centralizes student records, attendance tracking, curriculum management, and HR operations. The platform replaces manual ledgers with a digital registry, allowing administrators and facilitators to seamlessly track student performance, record attendance, manage payments, and generate analytics.

## 2. User Roles & Dashboards
The system uses Role-Based Access Control (RBAC) to serve different dashboards depending on the logged-in user:

* **Super Admin (`/super-admin`)**: Has global access to all system modules. Can configure system settings, manage department admins (HR/Education), view all reports, and monitor system health.
* **HR Admin (`/hr`)**: Manages human resources and student lifecycle. They can register new students, edit student details, manage attendance facilitators, and view attendance/payment reports.
* **Education Admin (`/education`)**: Manages the academic side of the Sunday school. They define curriculum subjects for each grade, oversee teachers, and manage bulk student results via the Results Management page.
* **Attendance Facilitator / HR Facilitator (`/facilitator/attendance`)**: Assigned to specific grades to take weekly or event-based attendance for students. 
* **Education Facilitator (`/facilitator/results`)**: Assigned to specific grades to record student scores (Assignments, Mid-terms, Finals).
* **Teacher / Schedule Manager**: Roles exist in the database schema but currently seem to lack dedicated top-level dashboards (they likely share facilitator views or are managed via the admin panels).

## 3. Main Features
The system currently implements the following core features:
* **Student Management**: Full CRUD for student demographics, photo uploads, QR code generation for ID cards, and tracking academic year enrollments.
* **Attendance Tracking**: Digital registers for taking attendance on Sundays, tracking absences, and marking authorized leaves.
* **Curriculum & Grading**: Dynamic subject assignment by grade. A dedicated grading module enforcing a maximum score of 100 (Assign: 20 + Mid: 30 + Final: 50).
* **HR & Facilitator Management**: Admins can assign users to specific roles and limit their access to specific grades or tasks.
* **Reporting & Analytics**: Exportable Excel reports for attendance, payments, and student performance.
* **Payments Status**: Manual tracking of monthly payments (Meskerem to Nehase).

## 4. Project Structure
The repository follows a standard Next.js App Router structure:

* **`src/app/`**: Contains all the page routes grouped by role (e.g., `/super-admin`, `/hr`, `/education`, `/facilitator`). Each folder has its own layout and sidebar.
* **`src/components/`**: Reusable React UI components (e.g., `StudentDetails`, `StudentResultsPanel`, `RoleSidebar`, tabs, and modals).
* **`src/lib/`**: Core utilities, database connection logic (`mongodb.ts`), TypeScript models/interfaces (`models.ts`), validation schemas, and rate-limiting configurations.
* **`attendance-mobile/`**: A sub-directory indicating the beginnings of a mobile application counterpart (currently containing basic login pages).

## 5. Database (MongoDB)
The system uses MongoDB with the following core collections (defined in `src/lib/models.ts`):
* **`Student` & `Enrollment`**: Stores demographic data and tracks which grade/academic year a student belongs to.
* **`User` / `Facilitator`**: Stores authentication credentials, roles, and assigned grades.
* **`Subject` & `SubjectGroup`**: Defines the curriculum mapped to specific grades and years.
* **`Result`**: Stores individual student scores, referencing both a `Student` and a `Subject`.
* **`Attendance`**: Records daily presence/absence, referencing a `Student`.
* **`Payment`**: Tracks monthly payment statuses for students.

## 6. Authentication & Permissions
* **Login Flow**: Users log in via a central `/login` page powered by NextAuth.js (Credentials provider).
* **Role Handling**: Upon successful authentication, the user's `role` is stored in the JWT session.
* **Permissions**: Access control is enforced at two levels:
  1. **UI Level**: Layouts and sidebars conditionally render based on `session.user.role`.
  2. **API Level**: API routes check the session role before allowing database mutations (e.g., only HR Admins can create students).

## 7. Current Problems
* **Duplicated Code**: Role-specific layouts (`/hr/layout.tsx`, `/education/layout.tsx`, `/super-admin/layout.tsx`) share a lot of boilerplate sidebar logic that could be abstracted.
* **Technical Debt**: Mixing of specific ID formats (MongoDB `ObjectId` vs custom `Unique_ID`) across frontend tabs has historically caused brittle API calls.
* **Missing Error Boundaries**: If a database fetch fails in a server component, it may crash the route instead of showing a friendly fallback.
* **Rate Limiting Configuration**: The Upstash Redis rate limiter currently throws internal `WRONGPASS` errors if credentials aren't perfectly synced in the `.env`, relying on an in-memory fallback.

## 8. Missing Features
* **Automated Payments**: Payment tracking is currently manual. There is no integration with Chapa, Telebirr, or CBE Birr.
* **Parent Portal**: No interface exists for parents to log in and check their children's attendance or grades.
* **Mobile App Parity**: The `attendance-mobile` directory is largely incomplete compared to the robust web dashboard.

## 9. Short Summary
**What the system currently does:** It successfully digitizes the administrative workflows of a Sunday School, handling everything from student registration to daily attendance and final grade calculations.
**What is working:** The core RBAC (Role-Based Access Control), student registry, grading matrix (20/30/50), and HR management modules are fully functional and heavily customized.
**What needs improvement:** Code duplication in layouts, stricter typing between database IDs and frontend props, and better global error handling.
**What to work on next:** Standardizing the API validation for `studentId`s, finalizing the mobile application for easier on-the-ground attendance tracking, and integrating an automated payment gateway.
