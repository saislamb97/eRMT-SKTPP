STPP Student Management (Next.js + PocketBase)

Overview

- Teacher auth (email/password via PocketBase). Admin manually verifies accounts in PocketBase before use.
- Dashboard for Sekolah Taman Putra Perdana.
- Attendance scan page: scan QR (Student ID) and mark present for today.
- Attendance view: filter by grade and see today’s presence.
- Canteen: lists today’s present students with a lunch received checkbox.
- Minimal UI built with Tailwind CSS.

Requirements

- Node.js 18+
- PocketBase 0.21+

Setup

1) Install dependencies

   npm install

2) Environment

   Copy `.env.example` to `.env.local` and set your PocketBase URL (e.g. `http://127.0.0.1:8090`).

3) Run Next.js

   npm run dev

4) PocketBase collections

- teachers (Auth collection)
  - Built-in fields: email, password, verified (we rely on this for manual admin verification)
  - Add field: name (text, required)
  - After a teacher registers, go to Admin UI → teachers → open the record and set `verified = true` manually to allow login.

- grades (Base collection)
  - Fields:
    - name (text, required, unique) – e.g. "Grade 1", "Grade 2"

- students (Base collection)
  - Fields:
    - studentId (text, required, unique) – encoded in each student QR
    - password (text, optional)
    - grade (relation → grades, maxSelect=1, required)
    - name (text, required)

- attendance (Base collection)
  - Fields:
    - student (relation → students, maxSelect=1, required)
    - present (bool, required, default=true)
    - date (date/time, required)
  - Notes: Scanning a QR creates an attendance record for today if one doesn’t already exist.

- canteen (Base collection)
  - Fields:
    - student (relation → students, maxSelect=1, required)
    - date (date/time, required)
    - lunchReceived (bool, required, default=false)
  - Notes: The Canteen page upserts a record for today per student when you tick the checkbox.

QR Codes

- Each student QR should contain only the Student ID (exact string match with `students.studentId`).

Pages

- /login – teacher login (blocks if not verified)
- /register – teacher registration (admin must verify before login)
- /dashboard – protected dashboard with school name and nav
- /attendance – scan QR, mark present for today; manual ID override field available
- /attendance/view – dropdown sourced from `grades` and a date picker
- /canteen – list of present students today; grade filter and search; tick lunch received

Notes

- Auth is client-side via PocketBase JS SDK. Pages are protected by checking `pb.authStore.isValid` and `record.verified`.
- Set `NEXT_PUBLIC_PB_URL` to match your PocketBase instance.
- For production, consider server-side session enforcement (cookies) and API routes for sensitive operations.
