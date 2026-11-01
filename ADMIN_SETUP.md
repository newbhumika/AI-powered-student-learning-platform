# Administrator Portal Setup Guide

The **AI-Powered Student Learning Assistant** enforces strict separation between student accounts and administrator governance using server-side `scrypt` password hashing, HMAC-SHA256 bearer session tokens, and persistent JSON document storage (`data/database.json`). Production credentials are **never** hardcoded into frontend source code.

---

## Option A: Environment Variable Configuration (Recommended for Production)

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your server `.env` file (or hosting Secrets panel):

```env
ADMIN_EMAIL="hod.cse@university.edu"
ADMIN_PASSWORD="ReplaceWithStrongFacultyPassword!"
```

When the server starts:
1. `syncEnvironmentAdmin()` hashes the configured password using cryptographic `scrypt` with a 16-byte random salt.
2. Creates or updates the administrator record (`role: 'admin'`) inside `data/database.json`.
3. Disables unauthenticated quick-demo admin access (`adminSandboxAccess: false`) so only verified administrators can enter the console.
4. Click **Admin Portal** in the navigation bar or landing page and sign in with your configured email and password.

---

## Option B: One-Time Interactive Admin Initialization (Academic Evaluation Mode)

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are not set in `.env`:
1. Open the website and click **Admin Portal**.
2. If zero administrator accounts exist (`GET /api/admin/status` -> `{ configured: false }`), the **Initialize First Administrator** form appears so you can create your primary faculty admin account (or use the server-backed **Instant Demo Admin Console** button during academic demonstrations).
3. Once an administrator is initialized, `/api/admin/setup` permanently locks (`403 Forbidden`) against unauthenticated setup requests.

---

## Administrator Capabilities
- **Platform Overview:** View total registered students, active accounts, cohort quiz attempts, average score, total saved notes, and AI module invocation breakdown.
- **Student Directory & Enrollment:** Enroll new students directly (`POST /api/admin/students`), search by name or email, inspect individual student quiz scores, saved notes, and activity timelines, reset forgotten student passwords, toggle active/deactivated status, or permanently remove student records with cascade cleanup.
- **Subjects & Topics Catalog:** Add or remove university subjects and recommended syllabus topics that populate dynamically across all student AI modules.
- **Platform Governance & Co-Admins:** Update institution name, pause/enable student self-registration, adjust per-minute AI rate limits, configure default quiz seconds per question, update your own admin credentials, and add additional Faculty Co-Administrators.
