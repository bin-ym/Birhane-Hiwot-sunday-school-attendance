# Environment Variables

## Required

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | Secret for NextAuth JWT signing (min 32 chars recommended) |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `https://your-domain.com`) |

## Security

| Variable | Description | Default |
|----------|-------------|---------|
| `QR_SECRET` | HMAC secret for QR code signing | — (QR scanning disabled if missing) |
| `CRON_SECRET` | Shared secret for cron job endpoints (`x-cron-secret` header) | — (cron disabled if missing) |

## CORS (Mobile App)

| Variable | Description |
|----------|-------------|
| `APP_URL` | Primary app origin for CORS (e.g. `https://your-domain.com`) |
| `MOBILE_APP_ORIGIN` | Mobile app origin for CORS (e.g. `exp://192.168.1.x:8081`) |

## Optional Services

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for distributed locking **and global rate limiting** (required in production) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Admin credentials for `npm run test:scale` (defaults `super@admin.com` / `admin123`) |
| `GOOGLE_SHEET_ID` | Google Sheets integration |
| `GOOGLE_CLIENT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |

## Database Selection

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_DB` | Override the default database name | `sunday_school` |

## Notes

- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`. Never commit this to version control.
- **QR_SECRET**: Generate with `openssl rand -hex 32`. Used to sign QR codes with HMAC-SHA256.
- **CRON_SECRET**: Set this to call `/api/cron/*` endpoints. Pass as `x-cron-secret` header.
- **CORS**: The mobile auth endpoint (`/api/mobile/auth`) only allows origins listed in `APP_URL` and `MOBILE_APP_ORIGIN`. Add `http://localhost:3000` and `http://localhost:8081` for local development.
