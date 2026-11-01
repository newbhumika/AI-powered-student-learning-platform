# AI-Powered Student Learning Assistant

A complete, production-grade intelligent academic learning platform developed as a **B.Tech Computer Science & Engineering (5th Semester) Summer Vocational Training (VT) Project**.

---

## Key Features

1. **Multi-Mode AI Study Assistant:** Conversational academic tutor with persistent conversation history, copyable Markdown responses, and 5 pedagogical modes (*Explain Like a Beginner*, *Detailed Explanation*, *Short Answer*, *Exam Preparation*, and *Step-by-Step*).
2. **AI Topic Explainer:** Generates 7-part structured breakdowns (Introduction, Detailed Explanation, Key Definitions, Important Points, Practical Examples, Revision Summary, and Viva FAQs) with one-click library saving and PDF export.
3. **Interactive AI Quiz Generator:** Generates 5, 10, 15, or 20 MCQs calibrated to Easy, Medium, or Hard difficulty with a live countdown timer, single-question navigator, server-side answer evaluation, and detailed explanations.
4. **AI Study Notes & PDF Handout Builder:** Creates *Short*, *Detailed*, *Exam-Oriented*, or *Bullet-Point* study notes with full save, edit, delete, copy, and multi-page A4 PDF download support.
5. **Empirical Student Progress Tracker:** Calculates real quiz completion counts, average and peak percentages, subject-wise mastery charts, and 7-day learning consistency directly from database records.
6. **Secure Admin Governance Portal:** Dedicated administrator console for student directory management, activity inspection, AI usage telemetry, subject/topic catalog CRUD, and platform settings configuration.

---

## Project Structure

```text
├── server.ts                                 # Full-stack Express + Vite API & static server
├── src/
│   ├── shared/types.ts                       # Shared TypeScript interfaces & contracts
│   ├── server/
│   │   ├── db.ts                             # 12-table persistent relational store
│   │   ├── auth.ts                           # scrypt hashing, HMAC tokens & RBAC guards
│   │   ├── rateLimit.ts                      # Sliding-window AI rate limiter
│   │   └── ai.ts                             # Server-only Gemini 3.8 Flash structured AI services
│   ├── context/AuthContext.tsx               # Session & Dual-Theme (Dark/Light) provider
│   ├── lib/
│   │   ├── api.ts                            # Authenticated REST client
│   │   └── pdfExport.ts                      # Multi-page academic PDF generator (jsPDF)
│   └── components/                           # Modular SaaS UI components
├── supabase/migrations/001_initial_schema.sql # PostgreSQL 12-table schema & RLS policies
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

See [INSTALLATION.md](./INSTALLATION.md) and [ADMIN_SETUP.md](./ADMIN_SETUP.md) for detailed instructions, and [documentation/PROJECT_REPORT_BTECH_VT.md](./documentation/PROJECT_REPORT_BTECH_VT.md) for the complete academic report.
