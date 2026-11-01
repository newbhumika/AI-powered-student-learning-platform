# AI-Powered Student Learning Assistant

A complete, production-grade intelligent academic learning platform developed as a **B.Tech Computer Science & Engineering (5th Semester) Summer Vocational Training (VT) Project**.

---

## Key Features

1. **Dual Role-Based Portals (Zero-SQL Persistent Document Store):**
   - **Student Learning Portal:** Student registration, login, 6-digit password recovery, profile management, and one-click academic sandbox access—all persisted atomically in a server-side NoSQL JSON document store (`data/database.json`) with zero external SQL server dependencies.
   - **Admin & Faculty Governance Console:** Dedicated administrator login, cohort KPI overview, AI module usage breakdown, student enrollment, password resets, individual student inspection (quiz history, saved notes, activity logs), co-administrator management, subject/topic catalog CRUD, and global rate-limit settings.
2. **Multi-Mode AI Study Assistant:** Conversational academic tutor with persistent conversation history, copyable Markdown responses, and 5 pedagogical modes (*Explain Like a Beginner*, *Detailed Explanation*, *Short Answer*, *Exam Preparation*, and *Step-by-Step*).
3. **AI Topic Explainer:** Generates 7-part structured breakdowns (Introduction, Detailed Explanation, Key Definitions, Important Points, Practical Examples, Revision Summary, and Viva FAQs) with one-click library saving and PDF export.
4. **Interactive AI Quiz Generator:** Generates 5, 10, 15, or 20 MCQs calibrated to Easy, Medium, or Hard difficulty with a live countdown timer, single-question navigator, server-side answer evaluation, and detailed explanations.
5. **AI Study Notes & PDF Handout Builder:** Creates *Short*, *Detailed*, *Exam-Oriented*, or *Bullet-Point* study notes with full save, edit, delete, copy, and multi-page A4 PDF download support.
6. **Empirical Student Progress Tracker:** Calculates real quiz completion counts, average and peak percentages, subject-wise mastery charts, and 7-day learning consistency directly from stored records.
7. **Dual-Theme Academic Interface:** Crisp **Daylight Alabaster & Deep Academic Teal** light theme paired with an **Obsidian Charcoal & Teal** dark theme.

---

## Project Structure

```text
├── server.ts                                 # Full-stack Express + Vite API & static server
├── data/database.json                        # Atomic 12-collection persistent NoSQL document store
├── src/
│   ├── shared/types.ts                       # Shared TypeScript interfaces & contracts
│   ├── server/
│   │   ├── db.ts                             # SQL-free DocumentStore with atomic disk commits
│   │   ├── auth.ts                           # scrypt hashing, HMAC tokens & RBAC guards
│   │   ├── rateLimit.ts                      # Sliding-window AI rate limiter
│   │   └── ai.ts                             # Server-only Gemini 3.8 Flash structured AI services
│   ├── context/AuthContext.tsx               # Session & Dual-Theme (Daylight/Obsidian) provider
│   ├── lib/
│   │   ├── api.ts                            # Authenticated REST client
│   │   └── pdfExport.ts                      # Multi-page academic PDF generator (jsPDF)
│   └── components/                           # Modular Student, Admin & Report UI components
├── documentation/PROJECT_REPORT_BTECH_VT.md  # Complete 18-chapter B.Tech VT Project Report
├── INSTALLATION.md                           # Local setup & deployment guide
└── ADMIN_SETUP.md                            # Secure administrator configuration guide
```

---

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack server on `http://localhost:3000`:
   ```bash
   npm run dev
   ```

See [INSTALLATION.md](./INSTALLATION.md) and [ADMIN_SETUP.md](./ADMIN_SETUP.md) for detailed instructions, and [documentation/PROJECT_REPORT_BTECH_VT.md](./documentation/PROJECT_REPORT_BTECH_VT.md) (also viewable in-app from the footer **VT Project Report** link) for the complete academic report.
