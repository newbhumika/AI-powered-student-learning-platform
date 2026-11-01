# Installation & Deployment Guide

## 1. Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10+
- **Gemini API Key:** Obtain an API key from Google AI Studio for server-side AI features.
- **Database Server:** **None required.** All student accounts, admin records, conversations, study notes, quizzes, and analytics persist automatically in the built-in NoSQL JSON document store (`data/database.json`).

---

## 2. Local Setup Instructions

1. **Install Project Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your credentials:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   APP_URL="http://localhost:3000"
   AUTH_SECRET="a_secure_random_32_character_secret_string"
   ADMIN_EMAIL="admin@university.edu"
   ADMIN_PASSWORD="StrongAdminPassword123!"
   ```

3. **Automatic Persistent Storage Initialization**
   - On startup, `src/server/db.ts` (`DocumentStore`) automatically creates `data/database.json`, initializes all 12 normalized collections (`profiles`, `subjects`, `topics`, `chat_conversations`, `chat_messages`, `saved_notes`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`, `user_activity`, `platform_settings`), and seeds the CSE 5th Semester curriculum catalog using atomic temp-file-rename disk writes.
   - No PostgreSQL, Cloud SQL, or external database provisioning is needed to run Student Login or the Admin Portal.

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 3. Production Build & Verification

1. **Type-Check TypeScript**
   ```bash
   npm run lint
   ```
2. **Build Production Frontend Bundle**
   ```bash
   npm run build
   ```
3. **Run Production Server**
   ```bash
   NODE_ENV=production npm start
   ```

---

## 4. Cloud Deployment
- Configure `GEMINI_API_KEY`, `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in your hosting provider's Environment Variables / Secrets panel.
- Set the build command to `npm run build` and the start command to `npm start` exposing port `3000`.
