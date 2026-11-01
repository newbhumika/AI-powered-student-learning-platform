# B.Tech Computer Science & Engineering (5th Semester)
## Summer Vocational Training (VT) Project Report
### Project Title: AI-Powered Student Learning Assistant

---

## 1. Project Introduction
The **AI-Powered Student Learning Assistant** is an intelligent, full-stack educational web platform engineered to transform passive textbook studying into an interactive, measurable, and personalized learning workflow. Designed for university and engineering students, the platform unifies five essential academic workflows inside a single workspace: a multi-mode conversational AI Study Tutor, a structured Topic Explainer, a timed Multiple-Choice Quiz Generator with automated grading, an editable Study Notes & PDF Handout Builder, and an empirical Student Progress Analytics engine, governed by a dedicated Faculty/Admin Portal.

---

## 2. Problem Statement
Undergraduate engineering and science students frequently struggle with:
1. **Fragmented Study Resources:** Students switch constantly between static lecture slides, dense reference textbooks, scattered video lectures, and generic chat interfaces that do not preserve structured study notes or track mastery.
2. **One-Size-Fits-All Explanations:** Standard study material rarely adapts between intuitive beginner analogies, step-by-step mathematical/algorithmic derivations, and concise exam-scoring formats.
3. **Lack of Immediate Self-Evaluation:** Students read chapters passively without immediately verifying comprehension via timed, difficulty-calibrated multiple-choice assessments.
4. **Absence of Empirical Progress Tracking:** Learners lack objective data showing which subjects (e.g., Operating Systems vs. DBMS) require urgent revision before semester examinations.

---

## 3. Project Objectives
- Provide **on-demand conceptual clarity** across five pedagogical modes (*Explain Like a Beginner*, *Detailed Explanation*, *Short Answer*, *Exam Preparation*, and *Step-by-Step*).
- Generate **7-part structured Topic Explanations** covering introductions, formal definitions, practical examples, quick-revision summaries, and viva-voce FAQs.
- Enable **automated self-assessment** via a timed 5–20 question MCQ Quiz Generator with instant evaluation and per-question answer rationales.
- Empower students to **compile, edit, save, and export PDF study notes** across four academic note styles (*Short*, *Detailed*, *Exam-Oriented*, and *Bullet-Point*).
- Calculate **100% database-driven analytics** (accuracy trends, subject-wise mastery, and weekly consistency) without dummy or hardcoded metrics.
- Deliver a **secure Admin Governance Portal** for managing curriculum subjects/topics, monitoring AI utilization, and overseeing student accounts.

---

## 4. Project Scope
The system serves two distinct user roles:
- **Student Role:** Self-registration, secure authentication, password recovery, profile customization, multi-turn AI study chat, structured topic exploration, timed MCQ quiz generation & review, personal notes library with Markdown editing & PDF export, and personal analytics dashboards.
- **Administrator / Faculty Role:** Secure environment-backed or one-time initialized authentication, cohort KPI monitoring, AI module telemetry, student account inspection & activation/deactivation, subject/topic catalog management, and global rate-limit/platform configuration.

---

## 5. Proposed System
Unlike generic chatbot wrappers, the proposed system enforces **server-side AI orchestration with structured JSON schemas**, ensuring deterministic educational outputs (such as validated 4-option MCQs with hidden server-side answer keys until submission, and multi-section study handouts). All API keys remain strictly isolated on the backend server behind authenticated, rate-limited endpoints.

---

## 6. Hardware Requirements
- **Development / Server Machine:**
  - Processor: Dual-Core or Quad-Core 64-bit CPU (Intel Core i5 / AMD Ryzen 5 or cloud equivalent)
  - Memory (RAM): Minimum 4 GB (8 GB recommended)
  - Storage: 2 GB available SSD space
- **Client Device (Student / Faculty):**
  - Any desktop, laptop, tablet, or smartphone capable of running a modern web browser with an active internet connection.

---

## 7. Software Requirements
- **Operating System:** Linux, macOS, or Windows 10/11
- **Runtime Environment:** Node.js v20+ / v22+
- **Database Engine:** PostgreSQL (Supabase PostgreSQL schema with RLS in `/supabase/migrations/001_initial_schema.sql`) & built-in atomic relational store (`data/database.json`) for zero-dependency academic sandbox execution
- **Web Browser:** Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari (latest versions)

---

## 8. Tools and Technologies Used
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts (Data Visualization), React-Markdown, jsPDF (Client-side PDF Handout Generation)
- **Backend:** Node.js, Express.js Server-Side API Routes, Cryptographic `scrypt` Password Hashing, HMAC-SHA256 Signed Bearer Session Tokens, Sliding-Window Rate Limiter
- **AI Engine:** Google Gemini API (`@google/genai` SDK using `gemini-3.8-flash` with `responseSchema` structured output enforcement)
- **Database Schema & Security:** Normalized 12-table relational schema with PostgreSQL Row Level Security (RLS) policies

---

## 9. System Architecture
The platform follows a **Three-Tier Secure Full-Stack Architecture**:
1. **Presentation Layer (Client SPA):** Responsive Dark-Navy & Violet SaaS interface with dual Light/Dark theme support, modular React views, interactive quiz timer state machine, and PDF document renderer.
2. **Application & Security Layer (Server API):** Express server handling input sanitization, `scrypt` credential verification, role-based access control (`requireAuth`, `requireAdmin`), per-user sliding-window AI rate limiting, and server-side `@google/genai` orchestration.
3. **Persistence Layer (Relational Store / PostgreSQL):** Stores normalized records across 12 interconnected entities while enforcing strict ownership boundaries (`user_id` isolation).

```
[Student / Admin Browser]
       │  HTTPS + Bearer Token (JSON REST)
       ▼
[Server API Layer: Auth + Validation + Rate Limiter]
       ├──► [Gemini 3.8 Flash Engine (@google/genai, Server-Only)]
       └──► [12-Table Relational Database Layer (Profiles, Quizzes, Notes, Activity)]
```

---

## 10. Database Design
The relational schema consists of **12 normalized tables**:
1. `profiles`: Stores student and admin accounts, hashed credentials, academic level, preferred subjects, and active status.
2. `subjects`: Curriculum course catalog (`code`, `name`, `semester`, `description`).
3. `topics`: Recommended syllabus topics linked via foreign key `subject_id -> subjects(id)`.
4. `chat_conversations`: Conversation threads owned by `user_id` with active pedagogical `mode`.
5. `chat_messages`: Individual `user` and `assistant` turns linked to `conversation_id`.
6. `saved_notes`: Student study notes and saved topic explanations (`short`, `detailed`, `exam`, `bullet`, `topic_explanation`).
7. `quizzes`: Generated quiz metadata (`subject`, `topic`, `difficulty`, `question_count`, `time_limit_seconds`).
8. `quiz_questions`: Individual MCQs with 4 options, `correct_option_index`, and academic `explanation`.
9. `quiz_attempts`: Graded quiz submissions storing `score`, `total_questions`, `percentage`, and `time_taken_seconds`.
10. `quiz_answers`: Per-question student selections (`selected_option_index`, `is_correct`) linked to `attempt_id`.
11. `user_activity`: Timestamped audit log of study sessions and AI usage telemetry.
12. `platform_settings`: Key-value governance configuration managed by administrators.

---

## 11. Module Descriptions
1. **Authentication & Role Guard Module:** Handles student registration, login, logout, 6-digit password recovery workflow, and separate administrator setup/login.
2. **Student Dashboard Module:** Aggregates live KPIs (total quizzes, average score, study sessions, saved notes), 7-day Recharts area graph, and recent activity timeline.
3. **AI Study Assistant Module:** Multi-turn academic tutor with conversation history persistence, copy-to-clipboard, Markdown code/list formatting, and 5 response modes.
4. **AI Topic Explainer Module:** Generates structured 7-section conceptual guides with one-click saving to the student's library and PDF handout download.
5. **AI Quiz Generator & Evaluation Module:** Generates 5–20 MCQs, conceals answer keys during the timed test, provides single-question navigation, auto-submits on timeout, and renders full post-submission explanations.
6. **AI Study Notes & PDF Builder Module:** Generates 4 types of study notes, supports full CRUD editing/deletion in a personal library, and exports paginated A4 PDFs.
7. **Student Progress Tracker Module:** Computes subject-wise accuracy bar charts, weekly study vs. quiz line graphs, and historical attempt tables from real database rows.
8. **Admin Governance Portal:** Provides cohort statistics, AI module breakdown charts, student account inspection/deactivation, subject/topic CRUD, and global settings management.

---

## 12. Implementation Methodology
The project was developed using an **Iterative Agile & Modular Full-Stack Methodology**:
- **Phase 1:** Requirements analysis, 12-table database schema design, and TypeScript contract definitions (`src/shared/types.ts`).
- **Phase 2:** Backend authentication (`scrypt` + HMAC tokens), rate limiting, and server-only Gemini structured-output services (`src/server/ai.ts`).
- **Phase 3:** Design system setup (Tailwind v4 dual-theme tokens, `Plus Jakarta Sans` + `DM Sans` + `JetBrains Mono` typography) and Landing Page implementation.
- **Phase 4:** Interactive Student Workspace modules, Recharts analytics integration, and client-side `jsPDF` document generation.
- **Phase 5:** Admin Governance Console, end-to-end validation, compilation checks, and technical documentation.

---

## 13. Testing and Validation
- **Authentication & Authorization Testing:** Verified registration validation, duplicate email rejection (`409 Conflict`), wrong-password rejection (`401 Unauthorized`), password reset code expiry, and `403 Forbidden` when a student token calls `/api/admin/*`.
- **Data Isolation Testing:** Confirmed Account A cannot read, edit, or delete Account B's conversations, notes, or quiz attempts.
- **Quiz Evaluation Integrity:** Verified that `/api/ai/generate-quiz` strips `correctOptionIndex` before sending questions to the browser, preventing client-side inspection prior to submission.
- **Rate Limiting & Error Handling:** Verified HTTP `429` response when exceeding configured requests per minute and clean `503` banner when `GEMINI_API_KEY` is absent.
- **Static Type & Build Verification:** Validated zero TypeScript errors (`tsc --noEmit`) and clean production Vite bundle compilation (`npm run build`).

---

## 14. Results and Screenshots Guide (For Viva & Report Submission)
When compiling screenshots for your printed B.Tech VT report, capture the following views in order:
1. **Figure 1:** Public Landing Page (Hero Section & Asymmetric Bento Capabilities Grid).
2. **Figure 2:** Student Registration Screen with Academic Level & Preferred Subjects selection.
3. **Figure 3:** Student Dashboard Overview showing KPI cards and 7-Day Study Consistency Chart.
4. **Figure 4:** AI Study Assistant answering an Operating Systems question in *Exam Preparation* mode.
5. **Figure 5:** AI Topic Explainer displaying Key Definitions, Practical Examples, and Viva FAQs.
6. **Figure 6:** Interactive Quiz Player showing countdown timer and Question Navigator palette.
7. **Figure 7:** Quiz Evaluation Result Page highlighting Correct/Incorrect selections and explanations.
8. **Figure 8:** AI Study Notes Builder & exported PDF handout open in a PDF viewer.
9. **Figure 9:** Student Progress Tracker displaying Subject-Wise Accuracy Bar Chart.
10. **Figure 10:** Admin Governance Console showing AI Module Usage Distribution and Curriculum Manager.

---

## 15. Limitations
- Live AI generation requires internet connectivity and an active server-side `GEMINI_API_KEY`.
- Automated quiz generation currently focuses on Multiple-Choice Questions (MCQs); subjective long-answer auto-grading with handwritten diagram upload is outside the current scope.
- Password recovery in local academic demo mode displays the 6-digit verification code directly unless an external SMTP server (`SMTP_HOST`) is configured.

---

## 16. Future Scope
- **Multimodal Lecture Slide & PDF Ingestion:** Allow students to upload university lecture PDFs or handwritten notes for targeted RAG-based quizzing.
- **Spaced Repetition Flashcards (SM-2 Algorithm):** Automatically schedule review intervals based on missed MCQ topics.
- **Voice Viva-Voce Simulator:** Real-time spoken mock viva examinations using low-latency audio streaming.
- **Collaborative Study Rooms:** Peer quiz competitions and shared department note repositories moderated by faculty.

---

## 17. Conclusion
The **AI-Powered Student Learning Assistant** successfully demonstrates how modern large language models, structured schema validation, and clean full-stack engineering can elevate university education. By combining concept explanation, active recall quizzing, editable PDF note synthesis, and honest empirical analytics inside a secure, role-governed platform, the project fulfills all academic and engineering objectives of the B.Tech CSE 5th Semester Summer Vocational Training program.

---

## 18. References
1. Google AI for Developers — *Gemini API & `@google/genai` SDK Documentation*: https://ai.google.dev/gemini-api/docs
2. React Documentation — *React 19 Official Guide*: https://react.dev/
3. PostgreSQL Global Development Group — *Row Security Policies Documentation*: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
4. Supabase Documentation — *Database & Authentication Architecture*: https://supabase.com/docs
5. Tailwind CSS v4 Documentation — *Styling & Dark Mode Architecture*: https://tailwindcss.com/docs
6. Roediger, H. L., & Karpicke, J. D. (2006). *Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention*. Psychological Science.
