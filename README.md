# Smart Attendance System with Anti-Proxy Measures

## Overview
A production-ready attendance system enforcing physical presence (Bluetooth range, OTP over Bluetooth, device/IP/browser/time pattern checks) and strong anti-proxy security.

## Monorepo Structure

```
/apps/
  /student-app/         # React Native app for students
  /teacher-app/         # React Native app for teachers
/backend/               # Node.js/Express backend API
/shared/                # Shared TypeScript types, utils, validation
/docs/                  # Flowcharts, security docs, process
```

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

- Edit `.env` for your Google Sheets or DB credentials.

### 2. Student/Teacher Apps

```bash
cd apps/student-app
npm install
npx expo start

cd apps/teacher-app
npm install
npx expo start
```

- Use Expo Go or build to device (Bluetooth requires physical device for full test).

---

## Key Features
- Bluetooth beaconing & scanning for proximity enforcement
- OTP exchange via Bluetooth (never over internet)
- Device, IP, browser, time pattern, and history security checks
- Google Sheets (easy DB migration)
- Admin and teacher dashboards (roadmap)
- Real-time security alerts

---

## Dev Notes

- For Bluetooth use, test on physical devices.
- n8n workflow can connect to backend endpoints for full automation.
- Backend and shared types are in TypeScript.

---

## Roadmap

- [X] Session/attendance flows (MVP)
- [ ] Admin dashboard (React web app)
- [ ] Advanced analytics
- [ ] Full n8n workflow templates

---

## License

MIT