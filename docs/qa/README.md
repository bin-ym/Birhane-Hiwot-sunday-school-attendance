# QA Documentation

QA assets for the Birhane Hiwot Sunday School Attendance Management System.

## Files

| File | Description |
|------|-------------|
| `Birhane-Hiwot-API.postman_collection.json` | Postman collection covering all REST API endpoints |
| `Birhane-Hiwot.postman_environment.json` | Environment variables (base URL, credentials, IDs) |
| `TEST-CASES.md` | Full manual & API test case document (148 cases) |

## Quick Start

1. **Import into Postman**
   - File → Import → select both JSON files in this folder.

2. **Configure environment**
   - Set `baseUrl` (e.g. `http://localhost:3000`).
   - Set email/password variables for each role you will test.

3. **Authenticate**
   - Run **Auth → Get CSRF Token**
   - Run **Auth → Login (Credentials)**

4. **Run tests**
   - Execute folders in order, or use the test case document for manual UI testing.

## Optional: Newman CLI

```bash
npm install -g newman
newman run docs/qa/Birhane-Hiwot-API.postman_collection.json \
  -e docs/qa/Birhane-Hiwot.postman_environment.json
```

## Notes

- Login uses NextAuth credentials flow (CSRF + session cookie).
- Protected API routes (facilitators, teachers, admin-users) require an authenticated session with the correct role.
- Student creation permissions are enforced via `userRole` and `userEmail` in the request body.
- Update `TEST-CASES.md` when adding new features or routes.
