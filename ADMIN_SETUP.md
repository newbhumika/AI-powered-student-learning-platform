# Student & Administrator Portal Access Guide

The **AI-Powered Student Learning Assistant** provides **open, passwordless access** to both the **Student Portal** and the **Admin Portal** for frictionless academic evaluation, demonstration, and daily use—while maintaining isolated per-user session tokens and persistent SQL-free document storage (`data/database.json`).

---

## 1. Instant One-Click Portal Access (No Password Required)

- **Student Portal:** Click **Student Portal** or **Open Student Portal** anywhere in the top navigation bar, hero section, portals hub, or footer to enter the student workspace immediately with zero password prompts.
- **Admin Portal:** Click **Admin Portal** or **Open Admin Portal** anywhere on the landing page—or click **Open Admin Portal** directly inside the Student sidebar—to enter the Faculty Governance Console with one click and no password required.

---

## 2. Switching or Creating Custom Profiles (Passwordless)

- **Custom Student Profiles:** Click **Custom Student Profile** on the landing page or **Switch Student Profile** inside the student sidebar to select an existing student profile or create a new student workspace using only **Full Name**, **Email**, and **Academic Semester** (no password required).
- **Direct Student Inspection from Admin Portal:** Inside the Admin Portal's **Student Directory**, select any student and click **Open Student Portal as [Student Name]** to switch directly into their live workspace without any password prompt.
- **Faculty Co-Administrators:** Under **Settings & Admins** in the Admin Portal, enroll additional faculty administrators with **Name** and **Email** only.

---

## 3. Administrator Console Capabilities
- **Platform Overview:** View total registered students, active accounts, cohort quiz attempts, average score, total saved notes, and AI module invocation breakdown.
- **Student Directory & Enrollment:** Enroll new students directly (`POST /api/admin/students`) without passwords, search by name or email, inspect individual student quiz scores, saved notes, and activity timelines, switch into any student's workspace, toggle active/deactivated status, or permanently remove student records with cascade cleanup.
- **Subjects & Topics Catalog:** Add or remove university subjects and recommended syllabus topics that populate dynamically across all student AI modules.
- **Platform Governance:** Update institution name, pause/enable student self-enrollment, adjust per-minute AI rate limits, configure default quiz seconds per question, update administrator display profile, and add Faculty Co-Administrators.
