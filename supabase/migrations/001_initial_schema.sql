-- =============================================================================
-- AI-Powered Student Learning Assistant
-- PostgreSQL / Supabase Complete Database Migration & Row Level Security (RLS)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  academic_level TEXT NOT NULL DEFAULT 'B.Tech CSE - 5th Semester',
  preferred_subjects TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper function to check Admin status in RLS policies without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  semester TEXT DEFAULT '5th Semester',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CHAT CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'detailed' CHECK (mode IN ('beginner', 'detailed', 'short', 'exam', 'step_by_step')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'detailed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SAVED NOTES TABLE (Includes Notes & Saved Topic Explanations)
CREATE TABLE IF NOT EXISTS public.saved_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('short', 'detailed', 'exam', 'bullet', 'topic_explanation')),
  structured_content JSONB,
  markdown_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_saved_notes_updated_at
BEFORE UPDATE ON public.saved_notes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_type TEXT NOT NULL DEFAULT 'MCQ' CHECK (question_type = 'MCQ'),
  question_count INTEGER NOT NULL CHECK (question_count IN (5, 10, 15, 20)),
  time_limit_seconds INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. QUIZ QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
  explanation TEXT NOT NULL
);

-- 9. QUIZ ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  percentage NUMERIC(5,2) NOT NULL,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. QUIZ ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

-- 11. USER ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('chat_message', 'topic_explained', 'quiz_completed', 'note_generated', 'login', 'ai_request')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'General',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON public.chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_id ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_saved_notes_user_id ON public.saved_notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id, question_index ASC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON public.quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Students read/update own profile; Admins read/update all
CREATE POLICY "Users view own profile or admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Subjects & Topics: Readable by everyone; writable only by Admins
CREATE POLICY "Public read subjects" ON public.subjects
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin manage subjects" ON public.subjects
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read topics" ON public.topics
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin manage topics" ON public.topics
  FOR ALL USING (public.is_admin());

-- Private Student Records: Strict Ownership (auth.uid() = user_id) + Admin read oversight
CREATE POLICY "Students own conversations" ON public.chat_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Students own chat messages" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Students own saved notes" ON public.saved_notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Students own quizzes" ON public.quizzes
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Students read own quiz questions" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND (q.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Students own quiz attempts" ON public.quiz_attempts
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Students own quiz answers" ON public.quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      WHERE a.id = quiz_answers.attempt_id
        AND (a.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Students own activity logs" ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Students insert own activity logs" ON public.user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Platform Settings: Readable by authenticated users, editable only by Admins
CREATE POLICY "Read platform settings" ON public.platform_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_admin());
