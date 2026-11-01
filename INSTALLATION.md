# Installation & Deployment Guide

## 1. Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10+
- **Gemini API Key:** Obtain an API key from Google AI Studio for server-side AI features.

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

3. **Database Setup**
   - **Zero-Config Local Persistence (Default):** On startup, the server automatically initializes all 12 normalized tables and seeds the CSE subject/topic catalog inside `data/database.json` with atomic disk commits.
   - **PostgreSQL / Supabase Setup (Cloud SQL / Supabase Hosted):**
     1. Create a new Supabase project.
     2. Open the **SQL Editor** in your Supabase Dashboard.
     3. Paste and run `supabase/migrations/001_initial_schema.sql` to create all 12 tables, foreign keys, indexes, `updated_at` triggers, and Row Level Security (RLS) policies.
     4. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file.

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
- Configure `GEMINI_API_KEY`, `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in your hosting provider's Environment Variables panel.
- Set the build command to `npm run build` and the start command to `npm start` exposing port `3000`.
