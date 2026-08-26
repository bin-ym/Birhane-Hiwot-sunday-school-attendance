# 📚 Birhane Hiwot Sunday School Management System
# (ብርሃነ ሕይወት ሰንበት ትምህርት ቤት የአቴንዳንስ እና የትምህርት ክፍል አስተዳደር ሲስተም)

A modern, full-stack **Next.js 15 & React 19** web and hybrid mobile platform built for **Birhane Hiwot Sunday School**. It centralizes student registry, daily/weekly attendance taking, Orthodox Sunday school curriculum management, academic score evaluations, 13-month Ethiopian fee payments, and offline-first mobile sync.

---

## 📖 Complete Technical Documentation

For the complete technical manual, architecture diagrams, domain logic, and full 38-endpoint API reference, read:
👉 **[`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md)**

---

## ✨ Core Features & Modules

- **🗓️ Native Ethiopian Calendar**: 13 Ethiopian months (*Meskerem* to *Pagumē*), Ethiopian date pickers, academic year tracking (`2018`).
- **👥 Student Registry & Integrity**: Automatic Unique_ID generation, 5-tuple name duplicate checks, registration window gating, and base64 photo profiles.
- **📝 Bulk Attendance**: Bulk upsert attendance marking, distributed Redis concurrency locking (`lock:attendance:{date}`), excused absence logging, and daily aggregation crons.
- **🛡️ Multi-Tier RBAC**: Tailored dashboards for **Super Admin**, **HR Admin**, **Education Admin**, **Attendance Facilitators**, **Education Facilitators**, and **Teachers**.
- **📱 Offline-First Mobile App**: Capacitor + Vite mobile app with IndexedDB (Dexie.js) local caching and automatic background sync queue.
- **🔍 HMAC-SHA256 Signed QR Codes**: Tamper-proof QR code generation & camera scanner verification.
- **📖 Orthodox Curriculum & Results**: Grade-grouped subjects (*ስርዓተ ቤተክርስቲያን*, *ነገረ ሃይማኖት*, *የመጽሐፍ ቅዱስ ጥናት*, etc.), teacher assignments, continuous assessments, and university letter grading (`A+` to `F`).
- **💳 13-Month Fee Tracking**: Lazy initialization and fee payment status tracking across all 13 Ethiopian months.
- **📊 Reports & Exports**: High-fidelity PDF grade reports (`jspdf`) and Excel spreadsheets (`xlsx`).
- **📑 OpenAPI & Swagger**: Interactive documentation live at `http://localhost:3000/api-docs` backed by `public/openapi.json`.
- **🧪 Automated QA Testing**: Native 63-test end-to-end automated suite (`npm run test`).

---

## 🚀 Quick Start

### 1. Install & Run Locally
```bash
# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 2. View Swagger API Docs
Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive API testing.

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Seed Database from Excel
```bash
npm run seed:excel
# Or dry-run
npm run seed:excel:dry
```

---

## 📁 Key Directories & Documents

| Path | Description |
|---|---|
| [`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md) | Master comprehensive technical architecture & domain guide |
| [`docs/qa/TEST-CASES.md`](docs/qa/TEST-CASES.md) | QA test case catalog (173 test cases) |
| [`docs/qa/Birhane-Hiwot-API.postman_collection.json`](docs/qa/Birhane-Hiwot-API.postman_collection.json) | Postman collection covering all 38 endpoints |
| [`docs/qa/Birhane-Hiwot.postman_environment.json`](docs/qa/Birhane-Hiwot.postman_environment.json) | Postman environment preset |
| [`public/openapi.json`](public/openapi.json) | OpenAPI 3.0.3 specification |
| [`scripts/run-automation-tests.mjs`](scripts/run-automation-tests.mjs) | End-to-end automated test runner |
| [`attendance-mobile/`](attendance-mobile/) | Capacitor / Vite hybrid mobile app |