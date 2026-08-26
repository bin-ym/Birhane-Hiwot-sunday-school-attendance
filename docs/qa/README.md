# QA Documentation

QA assets for the Birhane Hiwot Sunday School Attendance & Education Management System (ብርሃነ ሕይወት ሰንበት ትምህርት ቤት የአቴንዳንስ እና የትምህርት ክፍል አስተዳደር ሲስተም).

## Files

| File | Description |
|------|-------------|
| `Birhane-Hiwot-API.postman_collection.json` | Postman collection covering all 38 REST API endpoints with authentic Ethiopian Sunday School payloads |
| `Birhane-Hiwot.postman_environment.json` | Environment variables (base URL, authentic test credentials, academic year 2018, Ethiopian grade defaults) |
| `TEST-CASES.md` | Full manual & API test case document (173 comprehensive test cases) |
| `../public/openapi.json` | OpenAPI 3.0.3 spec — browsable at `/api-docs` (Swagger UI) |

## Quick Start

1. **Import into Postman**
   - File → Import → select both `Birhane-Hiwot-API.postman_collection.json` and `Birhane-Hiwot.postman_environment.json`.

2. **Configure environment**
   - Select the `Birhane Hiwot - Local & Production` environment.
   - Set `baseUrl` (defaults to `http://localhost:3000`).
   - Set email/password variables for each role you want to test.

3. **Setup & Authenticate**
   - Run **Setup → Create Super Admin (one-time)** if initializing a fresh database.
   - **Web Flow**: Run **Auth → Get CSRF Token**, then **Auth → Login (Credentials)**.
   - **Mobile Flow**: Run **Auth → Mobile Login (JWT)** to automatically save `mobileToken`.

4. **Run tests**
   - Execute folders in logical order: Students → Attendance → Facilitators → Teachers → Subjects → Results → Payments → etc.

## Swagger UI

Run the development server (`npm run dev`) and open `http://localhost:3000/api-docs` for the interactive Swagger UI backed by `public/openapi.json`.

## Optional: Newman CLI

```bash
npm install -g newman
newman run docs/qa/Birhane-Hiwot-API.postman_collection.json \
  -e docs/qa/Birhane-Hiwot.postman_environment.json
```
