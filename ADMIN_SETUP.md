# Administrator Portal Setup Guide

The **AI-Powered Student Learning Assistant** enforces strict separation between student accounts and administrator governance. Production credentials are **never** hardcoded into frontend source code.

---

## Option A: Environment Variable Configuration (Recommended for Production)

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your server `.env` file (or hosting Secrets panel):

```env
ADMIN_EMAIL="hod.cse@university.edu"
ADMIN_PASSWORD="ReplaceWithStrongFacultyPassword!"
```

When the server starts:
1. `syncEnvironmentAdmin()` hashes the configured password using cryptographic `scrypt` with a 16-byte random salt.
2. Creates or updates the administrator record (`role: 'admin'`) on the server.
3. Click **Admin Portal** in the top navigation bar and sign in with those credentials.

---

## Option B: One-Time Interactive Admin Initialization (Academic Demo Mode)

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are not set in `.env`:
1. Open the website and click **Admin Portal** in the top navigation bar.
2. The server detects that zero administrator accounts exist (`GET /api/admin/status` -> `{ configured: false }`) and displays the **Initialize First Administrator** form.
3. Enter your Administrator Name, Email, and a strong password (minimum 8 characters).
4. Once created, the `/api/admin/setup` endpoint permanently locks (`403 Forbidden`) so no subsequent visitor can claim administrator privileges.

---

## Administrator Capabilities
- **Platform Overview:** View total registered students, active accounts, cohort quiz attempts, average score, and AI module invocation breakdown.
- **Student Management:** Search students by name or email, inspect individual quiz history & activity timelines, and activate/deactivate student access.
- **Subjects & Topics Catalog:** Add or remove university subjects and recommended syllabus topics that populate across student AI modules.
- **Platform Governance Settings:** Update institution name, pause/enable student self-registration, adjust per-minute AI rate limits, and set default quiz seconds per question.
