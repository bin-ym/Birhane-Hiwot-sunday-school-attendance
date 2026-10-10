# Task 15 — Corrected Import Plan and Read-Only Validation Report for Grades 8 and 12

**Project:** Birhane Hiwot Sunday School Attendance System  
**Source Workbook:** `docs/የ 2019 ዓ_ም የከሰዓት መርሐ ግብር.xlsx`  
**Execution Timestamp:** 2026-10-10T15:59:32Z  
**Execution Mode:** Strictly Read-Only Inspection and Isolated Dry-Run Verification  
**Safety Status:** **Zero Database Writes Performed** · **Zero Production Imports Done** · **Zero PII Leaked**

---

## A. Workbook Summary

* **Workbook Path:** `docs/የ 2019 ዓ_ም የከሰዓት መርሐ ግብር.xlsx`
* **Verification Status:** VERIFIED (Valid Excel structure, opened and parsed cleanly)
* **Total Worksheets in File:** 8
* **Worksheets Processed (Strict Scope):**
  * `8(ስምንተኛ)` — Grade 8 (Canonical Grade: `"ስምንተኛ ክፍል"`)
  * `12(አሥራ ሁለት)` — Grade 12 (Canonical Grade: `"አስራ ሁለተኛ ክፍል"`)
* **Worksheets Excluded (Strict Scope):**
  * `7(ሰባተኛ)` (Grade 7), `Sheet11`, `9(ዘጠነኛ)`, `10(አሥረኛ)`, `11(አሥራ አንድ)`, `የርቀት` (Extension/Remote)
* **Total Source Student Records Identified:** **59**
* **Database Writes Attempted:** **0** (Enforced Zero-Write Guarantee)
* **Production Imports Performed:** **0** (Enforced Zero-Import Guarantee)

### Worksheet Breakdown
| Worksheet | Canonical Grade | Range | Total Rows | Actual Students | Pre-numbered Blank Rows | Completely Blank Rows |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `8(ስምንተኛ)` | `ስምንተኛ ክፍል` | `A1:AI78` | 78 | **36** | 9 (Serials 37–45) | 31 |
| `12(አሥራ ሁለት)` | `አስራ ሁለተኛ ክፍል` | `A1:AI1000` | 1000 | **23** | 0 | 975 |

---

## B. Identifier Validation

* **Application Pattern:** `ብሕ/YY/GG/NNN` (e.g. `ብሕ/19/08/001`, `ብሕ/19/12/001`)
* **Regex Compatibility:** Validated against `CANONICAL_ID_RE` (`/^[^\s]*\d+\s*\/\s*\d+$/`)

| Target Grade | Proposed Identifier Range | Format Validation | Conflict-Check Status | Conflicts Found | Unverified Identifiers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Grade 8 (`8(ስምንተኛ)`)** | `ብሕ/19/08/001` → `ብሕ/19/08/036` | **VALID** | **NOT_VERIFIED** *(Offline safety mode)* | 0 | 36 |
| **Grade 12 (`12(አሥራ ሁለት)`)** | `ብሕ/19/12/001` → `ብሕ/19/12/023` | **VALID** | **NOT_VERIFIED** *(Offline safety mode)* | 0 | 23 |

> *Note:* In accordance with Safety Rule 3 ("Do not connect to a production database"), conflict checking in default execution is marked `NOT_VERIFIED`. Isolated test fixtures in the automated test suite verified that database collisions are detected and correctly block records with `BLOCKED_IDENTIFIER_CONFLICT`.

---

## C. Data Quality Findings

| Data Quality Metric | Grade 8 (`8(ስምንተኛ)`) | Grade 12 (`12(አሥራ ሁለት)`) | Total |
| :--- | :--- | :--- | :--- |
| **Missing Required Names** | 1 (`በላቸው`, missing `Father_Name`) | 0 | 1 |
| **Missing Gender** | 13 (blank `Sex` cells) | 0 | 13 |
| **Missing Phone Number** | 33 (optional in schema) | 1 (optional in schema) | 34 |
| **Duplicate Name Flags** | 2 (`መሰረት ያለው` at rows 29 & 31) | 0 | 2 |
| **Invalid Source Identifiers** | 36 (raw serial integers 1–36) | 23 (raw serial integers 1–23) | 59 |
| **Existing-ID Conflicts** | 0 | 0 | 0 |

### Specific Findings:
1. **Grade 8 Single-Part Name (Row 13, Serial 11):**  
   Source text: `"በላቸው"`. Missing required `Father_Name`. Held for verification; excluded from import eligibility.
2. **Grade 8 Duplicate Name (Rows 29 & 31, Serials 27 & 29):**  
   Source text: `"መሰረት ያለው"` appears in both rows. Both records are preserved as distinct source rows with `DUPLICATE_NAME_REVIEW` audit warnings. Neither row is merged or deleted.
3. **Grade 8 Blank Genders (13 records):**  
   Missing gender is supported by the application schema/service layer as an empty string `""` without failing insertion. Classified as `ELIGIBLE_WITH_MISSING_GENDER`.
4. **Grade 12 Missing Phone (Row 3, Serial 2):**  
   Missing phone number is optional in the schema; flagged with a non-blocking warning and classified as `ELIGIBLE`.

---

## D. Eligibility Classification

Every source record is assigned **exactly one primary status** following the precedence rules:
1. `REJECTED_INVALID_SCHEMA`
2. `HELD_FOR_VERIFICATION`
3. `BLOCKED_IDENTIFIER_CONFLICT`
4. `SCHEMA_REVIEW_REQUIRED`
5. `ELIGIBLE_WITH_MISSING_GENDER`
6. `ELIGIBLE`

| Primary Eligibility Status | Grade 8 Count | Grade 12 Count | Total Records |
| :--- | :--- | :--- | :--- |
| **`ELIGIBLE`** | 22 | 23 | **45** |
| **`ELIGIBLE_WITH_MISSING_GENDER`** | 13 | 0 | **13** |
| **`HELD_FOR_VERIFICATION`** | 1 (`በላቸው`) | 0 | **1** |
| **`REJECTED_INVALID_SCHEMA`** | 0 | 0 | **0** |
| **`BLOCKED_IDENTIFIER_CONFLICT`** | 0 | 0 | **0** |
| **`SCHEMA_REVIEW_REQUIRED`** | 0 | 0 | **0** |
| **Reconciled Source Total** | **36** | **23** | **59** |

*All 59 source records reconcile 1:1 with primary status assignments. Audit warnings (such as duplicate-name reviews) do not inflate record counts.*

---

## E. Final Summary & Import Readiness

* **Total Source Records:** 59
* **Eligible Records (Complete Demographics):** 45
* **Eligible with Supported Missing Gender:** 13
* **Held Records (Missing Father Name):** 1
* **Rejected Records:** 0
* **Blocked by Identifier Conflict:** 0
* **Records Requiring Schema Review:** 0
* **Unverified Identifiers:** 59 *(Pending authorized database conflict check)*
* **Database Writes Attempted:** 0
* **Production Imports Performed:** 0

### Privacy & Data Protection Compliance:
* Zero student phone numbers exposed in console or report artifacts.
* Zero complete student dossiers exposed.
* Zero mutations or connections to production Atlas database.
