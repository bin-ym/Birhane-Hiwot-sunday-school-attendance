# BH Attendance Mobile (Capacitor)

Offline-first mobile app for **taking attendance only**. Built with Vite, React, Dexie (IndexedDB), and Capacitor.

## Features

- Login once against your Birhane Hiwot server
- Download and cache students for assigned grades
- Mark attendance offline (present / permission)
- QR scan support (works offline with local student cache)
- Queue attendance when offline, auto-sync when back online
- Android & iOS via Capacitor

## Prerequisites

- Node.js 20+
- Android Studio (Android) or Xcode (iOS)
- Main Next.js server running with `/api/mobile/auth` endpoint

## Setup

```bash
cd attendance-mobile
npm install
npm run dev          # browser dev at http://localhost:5173
```

### Configure server URL

On first login, you can tap **"⚙️ Server URL Settings"** right on the Login screen:

- **Local Development / Physical Phone on Wi-Fi**: `http://192.168.x.x:3000` (Your computer's LAN IP)
- **Android Emulator**: `http://10.0.2.2:3000`
- **Production Server**: `https://your-custom-domain.com`

You can tap the **"⚡ Test Server Connection"** button to verify connectivity before signing in.

Allowed roles: **Super Admin**, **HR Admin**, **Attendance Facilitator**

## Build APK for Android

```bash
# Build the APK directly via Gradle
npm run apk:debug

# Or open in Android Studio:
npm run cap:android
```

The compiled APK will be located at:
`attendance-mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Offline behavior

| Action | Offline | Online |
|--------|---------|--------|
| Login | ❌ (needs server once) | ✅ |
| View cached students | ✅ | ✅ |
| Mark attendance | ✅ saved locally | ✅ |
| Submit / sync | Queued | Uploaded to `/api/attendance` |
| QR scan | ✅ local lookup | ✅ + server verify |

## Project structure

```
attendance-mobile/
  src/
    lib/
      db.ts           # Dexie IndexedDB schema
      sync.ts         # Pull students, push attendance
      api.ts          # Server HTTP client
      settings.ts     # Capacitor Preferences (token, user)
    pages/
      LoginPage.tsx
      AttendancePage.tsx
```

## Backend requirement

The main app exposes:

```
POST /api/mobile/auth
Body: { email, password }
Response: { token, user }
```

This is used instead of browser cookies so the native app can authenticate reliably.

## Camera permission (Android)

Add to `android/app/src/main/AndroidManifest.xml` if not auto-added:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## Notes

- Attendance uses Ethiopian calendar dates (same format as the web app).
- After login, tap **Sync** to refresh the student list.
- Pending batches show in the sync bar until uploaded.
