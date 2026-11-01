import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import { store, generateId, sanitizeProfile, type StoredProfile } from './src/server/db.ts';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  revokeSessionToken,
  requireAuth,
  requireAdmin,
  hasConfiguredAdmin,
  syncEnvironmentAdmin,
  isProductionAdminLocked,
  getOrCreateSandboxProfile,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import { aiRateLimiter } from './src/server/rateLimit.ts';
import {
  isAiConfigured,
  normalizeAiError,
  generateStudyChatReply,
  generateTopicExplanation,
  generateQuizQuestions,
  generateStudyNotes,
} from './src/server/ai.ts';
import type {
  ChatMode,
  NoteType,
  QuizDifficulty,
  DashboardSummary,
  ProgressAnalytics,
  AdminOverviewData,
  QuizAttemptDetail,
} from './src/shared/types.ts';

const PORT = 3000;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getLast7DaysBuckets(): { date: string; day: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: { date: string; day: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    result.push({ date: isoDate, day: days[d.getDay()] });
  }
  return result;
}

async function startServer() {
  syncEnvironmentAdmin();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // =========================================================================
  // 1. PUBLIC METADATA & CURRICULUM CATALOG
  // =========================================================================
  app.get('/api/public/info', (_req, res) => {
    res.json({
      institutionName: store.getSetting(
        'institution_name',
        'Department of Computer Science & Engineering'
      ),
      allowRegistration:
        store.getSetting('allow_student_registration', 'true') === 'true',
      aiConfigured: isAiConfigured(),
      sandboxQuickAccess: !isProductionAdminLocked(),
      subjects: store.tables.subjects,
      topics: store.tables.topics,
    });
  });

  // =========================================================================
  // 2. STUDENT AUTHENTICATION & PASSWORD RECOVERY
  // =========================================================================
  app.post('/api/auth/register', (req, res) => {
    const allowReg =
      store.getSetting('allow_student_registration', 'true') === 'true';
    if (!allowReg) {
      res.status(403).json({
        error: 'New student registrations are currently paused by the administrator.',
      });
      return;
    }

    const fullName = String(req.body?.fullName ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const academicLevel =
      String(req.body?.academicLevel ?? '').trim() || 'B.Tech CSE - 5th Semester';
    const preferredSubjects = Array.isArray(req.body?.preferredSubjects)
      ? req.body.preferredSubjects.map((s: unknown) => String(s)).slice(0, 8)
      : ['Data Structures & Algorithms', 'Operating Systems', 'Database Management Systems'];

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid university or personal email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const exists = store.tables.profiles.some(
      (p) => p.email.toLowerCase() === email
    );
    if (exists) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newStudent: StoredProfile = {
      id: generateId(),
      email,
      passwordHash: hashPassword(password),
      fullName,
      avatarUrl: '',
      academicLevel,
      preferredSubjects,
      role: 'student',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.tables.profiles.push(newStudent);
    store.commit();

    store.logActivity({
      userId: newStudent.id,
      activityType: 'login',
      title: 'Created student account and started first session',
      subject: 'Account',
    });

    const token = createSessionToken(newStudent.id, 'student');
    res.status(201).json({
      token,
      user: sanitizeProfile(newStudent),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const matchingEmailProfile = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email
    );
    if (matchingEmailProfile && matchingEmailProfile.role === 'admin') {
      res.status(403).json({
        error: 'This email is registered as an Administrator. Please switch to the Admin Portal tab to sign in.',
      });
      return;
    }

    const profile =
      matchingEmailProfile?.role === 'student' ? matchingEmailProfile : undefined;

    if (!profile || !verifyPassword(password, profile.passwordHash)) {
      res.status(401).json({ error: 'Invalid student email or password.' });
      return;
    }

    if (!profile.isActive) {
      res.status(403).json({
        error: 'This student account has been deactivated by the administrator.',
      });
      return;
    }

    store.logActivity({
      userId: profile.id,
      activityType: 'login',
      title: 'Signed in to Student Learning Portal',
      subject: 'Account',
    });

    const token = createSessionToken(profile.id, profile.role);
    res.json({
      token,
      user: sanitizeProfile(profile),
    });
  });

  app.post('/api/auth/sandbox-session', (req, res) => {
    const requestedRole = req.body?.role === 'admin' ? 'admin' : 'student';
    if (requestedRole === 'admin' && isProductionAdminLocked()) {
      res.status(403).json({
        error: 'Quick admin access is disabled when production ADMIN_PASSWORD is set. Please sign in with your administrator credentials.',
      });
      return;
    }

    const profile = getOrCreateSandboxProfile(requestedRole);
    if (requestedRole === 'student') {
      store.logActivity({
        userId: profile.id,
        activityType: 'login',
        title: 'Entered Student Learning Portal (Local NoSQL Session)',
        subject: 'Account',
      });
    }

    const token = createSessionToken(profile.id, profile.role);
    res.json({
      token,
      user: sanitizeProfile(profile),
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.rawToken) {
      revokeSessionToken(req.rawToken);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeProfile(req.authUser!) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const profile = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email && p.role === 'student'
    );

    if (!profile) {
      res.status(404).json({ error: 'No registered student account found with that email.' });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    profile.resetCode = code;
    profile.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    store.commit();

    const smtpConfigured = Boolean(process.env.SMTP_HOST);
    res.json({
      message: smtpConfigured
        ? 'A 6-digit password reset code has been dispatched to your email.'
        : 'Password recovery code generated (Academic Sandbox Mode — SMTP relay not attached).',
      verificationCode: smtpConfigured ? undefined : code,
      expiresInMinutes: 15,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const code = String(req.body?.code ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '');

    if (!email || !code || newPassword.length < 6) {
      res.status(400).json({
        error: 'Valid email, 6-digit reset code, and a new password (min 6 characters) are required.',
      });
      return;
    }

    const profile = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email && p.role === 'student'
    );

    if (
      !profile ||
      !profile.resetCode ||
      profile.resetCode !== code ||
      !profile.resetCodeExpiresAt ||
      new Date(profile.resetCodeExpiresAt).getTime() < Date.now()
    ) {
      res.status(400).json({ error: 'Invalid or expired password recovery code.' });
      return;
    }

    profile.passwordHash = hashPassword(newPassword);
    profile.resetCode = null;
    profile.resetCodeExpiresAt = null;
    profile.updatedAt = new Date().toISOString();
    store.commit();

    res.json({ message: 'Password updated successfully. You may now sign in.' });
  });

  // =========================================================================
  // 3. STUDENT PROFILE MANAGEMENT
  // =========================================================================
  app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const fullName = String(req.body?.fullName ?? user.fullName).trim();
    const academicLevel = String(req.body?.academicLevel ?? user.academicLevel).trim();
    const avatarUrl = String(req.body?.avatarUrl ?? user.avatarUrl).trim();
    const preferredSubjects = Array.isArray(req.body?.preferredSubjects)
      ? req.body.preferredSubjects.map((s: unknown) => String(s).trim()).filter(Boolean)
      : user.preferredSubjects;

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }

    user.fullName = fullName;
    user.academicLevel = academicLevel || 'B.Tech CSE - 5th Semester';
    user.avatarUrl = avatarUrl;
    user.preferredSubjects = preferredSubjects;
    user.updatedAt = new Date().toISOString();
    store.commit();

    res.json({ user: sanitizeProfile(user) });
  });

  app.put('/api/profile/password', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    store.commit();

    res.json({ message: 'Account password updated successfully.' });
  });

  // =========================================================================
  // 4. STUDENT DASHBOARD & PROGRESS ANALYTICS (REAL DB CALCULATIONS ONLY)
  // =========================================================================
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;

    const attempts = store.tables.quiz_attempts.filter((a) => a.userId === userId);
    const notes = store.tables.saved_notes.filter((n) => n.userId === userId);
    const conversations = store.tables.chat_conversations.filter(
      (c) => c.userId === userId
    );
    const activities = store.tables.user_activity.filter(
      (act) => act.userId === userId && act.activityType !== 'ai_request'
    );

    const studySessions = activities.filter((a) =>
      ['chat_message', 'topic_explained', 'quiz_completed', 'note_generated'].includes(
        a.activityType
      )
    );

    const totalQuizzesAttempted = attempts.length;
    const averageQuizScore =
      totalQuizzesAttempted > 0
        ? Math.round(
            (attempts.reduce((sum, a) => sum + a.percentage, 0) /
              totalQuizzesAttempted) *
              10
          ) / 10
        : 0;
    const highestQuizScore =
      totalQuizzesAttempted > 0
        ? Math.max(...attempts.map((a) => a.percentage))
        : 0;

    const buckets = getLast7DaysBuckets();
    const weeklyProgress = buckets.map((b) => {
      const daySessions = studySessions.filter(
        (s) => s.createdAt.slice(0, 10) === b.date
      );
      const dayAttempts = attempts.filter(
        (a) => a.completedAt.slice(0, 10) === b.date
      );
      const avgScore =
        dayAttempts.length > 0
          ? Math.round(
              dayAttempts.reduce((sum, x) => sum + x.percentage, 0) /
                dayAttempts.length
            )
          : 0;
      return {
        day: b.day,
        date: b.date,
        sessions: daySessions.length,
        avgScore,
      };
    });

    const summary: DashboardSummary = {
      totalQuizzesAttempted,
      averageQuizScore,
      highestQuizScore,
      totalStudySessions: studySessions.length,
      totalSavedNotes: notes.length,
      totalConversations: conversations.length,
      recentActivities: activities.slice(0, 8),
      weeklyProgress,
    };

    res.json(summary);
  });

  app.get('/api/analytics', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const attempts = store.tables.quiz_attempts
      .filter((a) => a.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

    const activities = store.tables.user_activity.filter(
      (act) => act.userId === userId && act.activityType !== 'ai_request'
    );

    const totalQuizzesCompleted = attempts.length;
    const averagePercentage =
      totalQuizzesCompleted > 0
        ? Math.round(
            (attempts.reduce((s, a) => s + a.percentage, 0) /
              totalQuizzesCompleted) *
              10
          ) / 10
        : 0;
    const highestScore =
      totalQuizzesCompleted > 0
        ? Math.max(...attempts.map((a) => a.percentage))
        : 0;
    const totalQuestionsAnswered = attempts.reduce(
      (s, a) => s + a.totalQuestions,
      0
    );
    const totalCorrectAnswers = attempts.reduce((s, a) => s + a.score, 0);

    // Subject-wise aggregation
    const subjectMap = new Map<
      string,
      { count: number; sumPct: number; maxPct: number }
    >();
    for (const att of attempts) {
      const current = subjectMap.get(att.subject) ?? {
        count: 0,
        sumPct: 0,
        maxPct: 0,
      };
      current.count += 1;
      current.sumPct += att.percentage;
      current.maxPct = Math.max(current.maxPct, att.percentage);
      subjectMap.set(att.subject, current);
    }

    const subjectPerformance = Array.from(subjectMap.entries()).map(
      ([subject, val]) => ({
        subject,
        attempts: val.count,
        averagePercentage: Math.round((val.sumPct / val.count) * 10) / 10,
        highestPercentage: val.maxPct,
      })
    );

    const buckets = getLast7DaysBuckets();
    const weeklyProgress = buckets.map((b) => {
      const dayAttempts = attempts.filter(
        (a) => a.completedAt.slice(0, 10) === b.date
      );
      const dayActivities = activities.filter(
        (act) =>
          act.createdAt.slice(0, 10) === b.date && act.activityType !== 'login'
      );
      const avg =
        dayAttempts.length > 0
          ? Math.round(
              dayAttempts.reduce((s, a) => s + a.percentage, 0) /
                dayAttempts.length
            )
          : 0;
      return {
        day: b.day,
        date: b.date,
        quizzesCompleted: dayAttempts.length,
        studyActivities: dayActivities.length,
        averagePercentage: avg,
      };
    });

    const analytics: ProgressAnalytics = {
      totalQuizzesCompleted,
      averagePercentage,
      highestScore,
      totalQuestionsAnswered,
      totalCorrectAnswers,
      subjectPerformance,
      recentQuizResults: attempts.slice(0, 12),
      activityHistory: activities.slice(0, 25),
      weeklyProgress,
    };

    res.json(analytics);
  });

  // =========================================================================
  // 5. AI STUDY ASSISTANT (CONVERSATIONS & MULTI-MODE CHAT)
  // =========================================================================
  app.get('/api/chat/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const list = store.tables.chat_conversations
      .filter((c) => c.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    res.json({ conversations: list });
  });

  app.get(
    '/api/chat/conversations/:id/messages',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const userId = req.authUser!.id;
      const conv = store.tables.chat_conversations.find(
        (c) => c.id === req.params.id && c.userId === userId
      );
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      const messages = store.tables.chat_messages
        .filter((m) => m.conversationId === conv.id && m.userId === userId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      res.json({ conversation: conv, messages });
    }
  );

  app.delete(
    '/api/chat/conversations/:id',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const userId = req.authUser!.id;
      const idx = store.tables.chat_conversations.findIndex(
        (c) => c.id === req.params.id && c.userId === userId
      );
      if (idx === -1) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      const convId = store.tables.chat_conversations[idx].id;
      store.tables.chat_conversations.splice(idx, 1);
      store.tables.chat_messages = store.tables.chat_messages.filter(
        (m) => m.conversationId !== convId
      );
      store.commit();
      res.json({ success: true });
    }
  );

  app.post(
    '/api/ai/chat',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.authUser!;
        const prompt = String(req.body?.prompt ?? '').trim();
        const validModes: ChatMode[] = [
          'beginner',
          'detailed',
          'short',
          'exam',
          'step_by_step',
        ];
        const mode: ChatMode = validModes.includes(req.body?.mode)
          ? req.body.mode
          : 'detailed';
        let conversationId = String(req.body?.conversationId ?? '').trim();

        if (!prompt) {
          res.status(400).json({ error: 'Please enter an academic question.' });
          return;
        }
        if (prompt.length > 4000) {
          res.status(400).json({ error: 'Question is too long (max 4,000 characters).' });
          return;
        }

        let conversation = store.tables.chat_conversations.find(
          (c) => c.id === conversationId && c.userId === user.id
        );

        const now = new Date().toISOString();
        if (!conversation) {
          conversation = {
            id: generateId(),
            userId: user.id,
            title: prompt.slice(0, 65) + (prompt.length > 65 ? '...' : ''),
            mode,
            createdAt: now,
            updatedAt: now,
          };
          store.tables.chat_conversations.push(conversation);
        }

        const existingHistory = store.tables.chat_messages
          .filter((m) => m.conversationId === conversation!.id)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          .map((m) => ({ role: m.role, content: m.content }));

        const aiAnswer = await generateStudyChatReply({
          history: existingHistory,
          prompt,
          mode,
          academicLevel: user.academicLevel,
        });

        const userMsg = {
          id: generateId(),
          conversationId: conversation.id,
          userId: user.id,
          role: 'user' as const,
          content: prompt,
          mode,
          createdAt: now,
        };

        const assistantMsg = {
          id: generateId(),
          conversationId: conversation.id,
          userId: user.id,
          role: 'assistant' as const,
          content: aiAnswer,
          mode,
          createdAt: new Date().toISOString(),
        };

        conversation.mode = mode;
        conversation.updatedAt = assistantMsg.createdAt;

        store.tables.chat_messages.push(userMsg, assistantMsg);
        store.logActivity({
          userId: user.id,
          activityType: 'chat_message',
          title: `Asked AI Study Assistant: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
          subject: 'AI Study Assistant',
          metadata: { mode },
        });
        store.logActivity({
          userId: user.id,
          activityType: 'ai_request',
          title: 'AI Study Assistant Chat',
          subject: 'AI Study Assistant',
          metadata: { module: 'Study Assistant', mode },
        });

        res.json({
          conversation,
          userMessage: userMsg,
          assistantMessage: assistantMsg,
        });
      } catch (err) {
        const normalized = normalizeAiError(err);
        res.status(normalized.status).json({ error: normalized.message });
      }
    }
  );

  // =========================================================================
  // 6. AI TOPIC EXPLAINER
  // =========================================================================
  app.post(
    '/api/ai/explain-topic',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.authUser!;
        const subject = String(req.body?.subject ?? '').trim();
        const topic = String(req.body?.topic ?? '').trim();
        const academicLevel =
          String(req.body?.academicLevel ?? '').trim() || user.academicLevel;
        const difficulty = String(req.body?.difficulty ?? 'Intermediate').trim();

        if (!subject || !topic) {
          res.status(400).json({ error: 'Both subject and topic are required.' });
          return;
        }

        const result = await generateTopicExplanation({
          subject,
          topic,
          academicLevel,
          difficulty,
        });

        store.logActivity({
          userId: user.id,
          activityType: 'topic_explained',
          title: `Explored topic: ${topic}`,
          subject,
          metadata: { difficulty, academicLevel },
        });
        store.logActivity({
          userId: user.id,
          activityType: 'ai_request',
          title: `Topic Explainer: ${topic}`,
          subject,
          metadata: { module: 'Topic Explainer' },
        });

        res.json(result);
      } catch (err) {
        const normalized = normalizeAiError(err);
        res.status(normalized.status).json({ error: normalized.message });
      }
    }
  );

  // =========================================================================
  // 7. AI QUIZ GENERATOR & INTERACTIVE EVALUATION
  // =========================================================================
  app.post(
    '/api/ai/generate-quiz',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.authUser!;
        const subject = String(req.body?.subject ?? '').trim();
        const topic = String(req.body?.topic ?? '').trim();
        const rawCount = Number(req.body?.questionCount ?? 5);
        const questionCount = [5, 10, 15, 20].includes(rawCount) ? rawCount : 5;
        const validDiffs: QuizDifficulty[] = ['Easy', 'Medium', 'Hard'];
        const difficulty: QuizDifficulty = validDiffs.includes(req.body?.difficulty)
          ? req.body.difficulty
          : 'Medium';

        if (!subject || !topic) {
          res.status(400).json({ error: 'Subject and topic are required to generate a quiz.' });
          return;
        }

        const generatedQuestions = await generateQuizQuestions({
          subject,
          topic,
          questionCount,
          difficulty,
          academicLevel: user.academicLevel,
        });

        const secPerQ =
          parseInt(store.getSetting('default_quiz_seconds_per_question', '60'), 10) ||
          60;
        const quizId = generateId();
        const now = new Date().toISOString();

        const quiz = {
          id: quizId,
          userId: user.id,
          subject,
          topic,
          difficulty,
          questionType: 'MCQ' as const,
          questionCount: generatedQuestions.length,
          timeLimitSeconds: generatedQuestions.length * secPerQ,
          createdAt: now,
        };

        const storedQuestions = generatedQuestions.map((q, idx) => ({
          id: generateId(),
          quizId,
          questionIndex: idx,
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
        }));

        store.tables.quizzes.unshift(quiz);
        store.tables.quiz_questions.push(...storedQuestions);
        store.logActivity({
          userId: user.id,
          activityType: 'ai_request',
          title: `Generated ${generatedQuestions.length}-question MCQ quiz on ${topic}`,
          subject,
          metadata: { module: 'Quiz Generator', difficulty },
        });

        res.status(201).json({
          quiz: {
            ...quiz,
            questions: storedQuestions.map((q) => ({
              id: q.id,
              quizId: q.quizId,
              questionIndex: q.questionIndex,
              questionText: q.questionText,
              options: q.options,
            })),
          },
        });
      } catch (err) {
        const normalized = normalizeAiError(err);
        res.status(normalized.status).json({ error: normalized.message });
      }
    }
  );

  app.get('/api/quizzes', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const attempts = store.tables.quiz_attempts
      .filter((a) => a.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    res.json({ attempts });
  });

  app.post(
    '/api/quizzes/:id/submit',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const quiz = store.tables.quizzes.find(
        (q) => q.id === req.params.id && q.userId === user.id
      );
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found.' });
        return;
      }

      const questions = store.tables.quiz_questions
        .filter((q) => q.quizId === quiz.id)
        .sort((a, b) => a.questionIndex - b.questionIndex);

      const submittedAnswers: Record<string, number> =
        req.body?.answers && typeof req.body.answers === 'object'
          ? req.body.answers
          : {};
      const timeTakenSeconds = Math.max(
        0,
        Math.round(Number(req.body?.timeTakenSeconds ?? 0))
      );

      const attemptId = generateId();
      let score = 0;

      const answerRecords = questions.map((q) => {
        const rawSel = submittedAnswers[q.id];
        const selectedOptionIndex =
          typeof rawSel === 'number' && rawSel >= 0 && rawSel <= 3 ? rawSel : -1;
        const isCorrect = selectedOptionIndex === q.correctOptionIndex;
        if (isCorrect) score += 1;
        return {
          id: generateId(),
          attemptId,
          questionId: q.id,
          selectedOptionIndex,
          isCorrect,
        };
      });

      const totalQuestions = questions.length;
      const percentage =
        totalQuestions > 0
          ? Math.round((score / totalQuestions) * 1000) / 10
          : 0;
      const now = new Date().toISOString();

      const attempt = {
        id: attemptId,
        quizId: quiz.id,
        userId: user.id,
        subject: quiz.subject,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        score,
        totalQuestions,
        percentage,
        timeTakenSeconds,
        completedAt: now,
        createdAt: now,
      };

      store.tables.quiz_attempts.unshift(attempt);
      store.tables.quiz_answers.push(...answerRecords);
      store.logActivity({
        userId: user.id,
        activityType: 'quiz_completed',
        title: `Completed quiz on "${quiz.topic}" — Scored ${score}/${totalQuestions} (${percentage}%)`,
        subject: quiz.subject,
        metadata: { score, totalQuestions, percentage },
      });

      const detail: QuizAttemptDetail = {
        ...attempt,
        questions: questions.map((q) => {
          const ans = answerRecords.find((a) => a.questionId === q.id)!;
          return {
            id: q.id,
            questionIndex: q.questionIndex,
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            selectedOptionIndex: ans.selectedOptionIndex,
            isCorrect: ans.isCorrect,
            explanation: q.explanation,
          };
        }),
      };

      res.json({ result: detail });
    }
  );

  app.get(
    '/api/quiz-attempts/:id',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const user = req.authUser!;
      const attempt = store.tables.quiz_attempts.find(
        (a) =>
          a.id === req.params.id &&
          (a.userId === user.id || user.role === 'admin')
      );
      if (!attempt) {
        res.status(404).json({ error: 'Quiz attempt record not found.' });
        return;
      }

      const questions = store.tables.quiz_questions
        .filter((q) => q.quizId === attempt.quizId)
        .sort((a, b) => a.questionIndex - b.questionIndex);
      const answers = store.tables.quiz_answers.filter(
        (ans) => ans.attemptId === attempt.id
      );

      const detail: QuizAttemptDetail = {
        ...attempt,
        questions: questions.map((q) => {
          const ans = answers.find((a) => a.questionId === q.id);
          return {
            id: q.id,
            questionIndex: q.questionIndex,
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            selectedOptionIndex: ans ? ans.selectedOptionIndex : -1,
            isCorrect: ans ? ans.isCorrect : false,
            explanation: q.explanation,
          };
        }),
      };

      res.json({ result: detail });
    }
  );

  // =========================================================================
  // 8. AI STUDY NOTES GENERATOR & SAVED NOTES CRUD
  // =========================================================================
  app.post(
    '/api/ai/generate-notes',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.authUser!;
        const subject = String(req.body?.subject ?? '').trim() || 'General Studies';
        const topic = String(req.body?.topic ?? '').trim();
        const validTypes: Exclude<NoteType, 'topic_explanation'>[] = [
          'short',
          'detailed',
          'exam',
          'bullet',
        ];
        const noteType = validTypes.includes(req.body?.noteType)
          ? req.body.noteType
          : 'detailed';

        if (!topic) {
          res.status(400).json({ error: 'Please enter a topic to generate notes.' });
          return;
        }

        const generated = await generateStudyNotes({
          subject,
          topic,
          noteType,
          academicLevel: user.academicLevel,
        });

        store.logActivity({
          userId: user.id,
          activityType: 'note_generated',
          title: `Generated ${noteType} study notes on "${topic}"`,
          subject,
          metadata: { noteType },
        });
        store.logActivity({
          userId: user.id,
          activityType: 'ai_request',
          title: `Study Notes Generator: ${topic}`,
          subject,
          metadata: { module: 'Notes Generator', noteType },
        });

        res.json(generated);
      } catch (err) {
        const normalized = normalizeAiError(err);
        res.status(normalized.status).json({ error: normalized.message });
      }
    }
  );

  app.get('/api/notes', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.authUser!.id;
    const notes = store.tables.saved_notes
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    res.json({ notes });
  });

  app.post('/api/notes', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const title = String(req.body?.title ?? '').trim();
    const subject = String(req.body?.subject ?? 'General').trim();
    const topic = String(req.body?.topic ?? title).trim();
    const noteType: NoteType = req.body?.noteType || 'detailed';
    const markdownContent = String(req.body?.markdownContent ?? '').trim();
    const structuredContent = req.body?.structuredContent;

    if (!title || !markdownContent) {
      res.status(400).json({ error: 'Note title and content are required.' });
      return;
    }

    const now = new Date().toISOString();
    const saved = {
      id: generateId(),
      userId: user.id,
      title,
      subject,
      topic,
      noteType,
      structuredContent,
      markdownContent,
      createdAt: now,
      updatedAt: now,
    };

    store.tables.saved_notes.unshift(saved);
    store.commit();

    res.status(201).json({ note: saved });
  });

  app.put('/api/notes/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const note = store.tables.saved_notes.find(
      (n) => n.id === req.params.id && n.userId === user.id
    );
    if (!note) {
      res.status(404).json({ error: 'Saved note not found.' });
      return;
    }

    const title = String(req.body?.title ?? note.title).trim();
    const subject = String(req.body?.subject ?? note.subject).trim();
    const markdownContent = String(
      req.body?.markdownContent ?? note.markdownContent
    ).trim();

    if (!title || !markdownContent) {
      res.status(400).json({ error: 'Title and note content cannot be empty.' });
      return;
    }

    note.title = title;
    note.subject = subject;
    note.markdownContent = markdownContent;
    note.updatedAt = new Date().toISOString();
    store.commit();

    res.json({ note });
  });

  app.delete('/api/notes/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const idx = store.tables.saved_notes.findIndex(
      (n) => n.id === req.params.id && n.userId === user.id
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Saved note not found.' });
      return;
    }
    store.tables.saved_notes.splice(idx, 1);
    store.commit();
    res.json({ success: true });
  });

  // =========================================================================
  // 9. SECURE ADMIN PORTAL ENDPOINTS
  // =========================================================================
  app.get('/api/admin/status', (_req, res) => {
    res.json({ configured: hasConfiguredAdmin() });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (hasConfiguredAdmin()) {
      res.status(403).json({
        error: 'Administrator is already configured. Please sign in with your administrator credentials.',
      });
      return;
    }

    const fullName = String(req.body?.fullName ?? 'Platform Administrator').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!isValidEmail(email) || password.length < 8) {
      res.status(400).json({
        error: 'Valid administrator email and a strong password (minimum 8 characters) are required.',
      });
      return;
    }

    const existing = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email
    );
    if (existing) {
      res.status(409).json({
        error: 'Email is already registered as a student account. Use a dedicated admin email.',
      });
      return;
    }

    const now = new Date().toISOString();
    const adminProfile: StoredProfile = {
      id: generateId(),
      email,
      passwordHash: hashPassword(password),
      fullName: fullName || 'Platform Administrator',
      avatarUrl: '',
      academicLevel: 'Faculty / Administration',
      preferredSubjects: [],
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.tables.profiles.push(adminProfile);
    store.commit();

    const token = createSessionToken(adminProfile.id, 'admin');
    res.status(201).json({
      token,
      user: sanitizeProfile(adminProfile),
    });
  });

  app.post('/api/admin/login', (req, res) => {
    syncEnvironmentAdmin();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const matchingProfile = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email
    );
    if (matchingProfile && matchingProfile.role === 'student') {
      res.status(403).json({
        error: 'This email belongs to a Student account. Please switch to the Student Sign In tab.',
      });
      return;
    }

    const admin =
      matchingProfile?.role === 'admin' ? matchingProfile : undefined;

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    const token = createSessionToken(admin.id, 'admin');
    res.json({
      token,
      user: sanitizeProfile(admin),
    });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const students = store.tables.profiles.filter((p) => p.role === 'student');
    const allAttempts = store.tables.quiz_attempts;
    const allNotes = store.tables.saved_notes;
    const aiRequests = store.tables.user_activity.filter(
      (a) => a.activityType === 'ai_request'
    );

    const moduleCounter = new Map<string, number>([
      ['Study Assistant', 0],
      ['Topic Explainer', 0],
      ['Quiz Generator', 0],
      ['Notes Generator', 0],
    ]);

    for (const reqItem of aiRequests) {
      const mod = String(reqItem.metadata?.module ?? 'Study Assistant');
      moduleCounter.set(mod, (moduleCounter.get(mod) ?? 0) + 1);
    }

    const enrichedStudents = students.map((st) => {
      const stAttempts = allAttempts.filter((a) => a.userId === st.id);
      const stNotes = allNotes.filter((n) => n.userId === st.id);
      const stActs = store.tables.user_activity.filter((a) => a.userId === st.id);
      const avgScore =
        stAttempts.length > 0
          ? Math.round(
              (stAttempts.reduce((sum, x) => sum + x.percentage, 0) /
                stAttempts.length) *
                10
            ) / 10
          : 0;
      return {
        ...sanitizeProfile(st),
        quizzesAttempted: stAttempts.length,
        averageScore: avgScore,
        notesCount: stNotes.length,
        lastActiveAt: stActs.length > 0 ? stActs[0].createdAt : null,
      };
    });

    const profileLookup = new Map(
      store.tables.profiles.map((p) => [p.id, p])
    );

    const recentActivities = store.tables.user_activity
      .filter((a) => a.activityType !== 'ai_request')
      .slice(0, 30)
      .map((act) => {
        const p = profileLookup.get(act.userId);
        return {
          ...act,
          studentName: p?.fullName ?? 'Student',
          studentEmail: p?.email ?? '',
        };
      });

    const averagePlatformScore =
      allAttempts.length > 0
        ? Math.round(
            (allAttempts.reduce((s, a) => s + a.percentage, 0) /
              allAttempts.length) *
              10
          ) / 10
        : 0;

    const overview: AdminOverviewData = {
      stats: {
        totalStudents: students.length,
        activeStudents: students.filter((s) => s.isActive).length,
        totalQuizzesAttempted: allAttempts.length,
        averagePlatformScore,
        totalAiRequests: aiRequests.length,
        totalSavedNotes: allNotes.length,
        aiBreakdown: Array.from(moduleCounter.entries()).map(
          ([module, count]) => ({ module, count })
        ),
      },
      students: enrichedStudents,
      recentActivities,
      subjects: store.tables.subjects,
      topics: store.tables.topics,
      settings: store.tables.platform_settings,
      admins: store.tables.profiles
        .filter((p) => p.role === 'admin')
        .map(sanitizeProfile),
    };

    res.json(overview);
  });

  app.get('/api/admin/students/:id', requireAdmin, (req, res) => {
    const st = store.tables.profiles.find(
      (p) => p.id === req.params.id && p.role === 'student'
    );
    if (!st) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const attempts = store.tables.quiz_attempts.filter((a) => a.userId === st.id);
    const notes = store.tables.saved_notes.filter((n) => n.userId === st.id);
    const activities = store.tables.user_activity
      .filter((a) => a.userId === st.id && a.activityType !== 'ai_request')
      .slice(0, 30);

    res.json({
      student: sanitizeProfile(st),
      attempts,
      notesCount: notes.length,
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        subject: n.subject,
        noteType: n.noteType,
        updatedAt: n.updatedAt,
      })),
      activities,
    });
  });

  app.post('/api/admin/students', requireAdmin, (req, res) => {
    const fullName = String(req.body?.fullName ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const academicLevel =
      String(req.body?.academicLevel ?? '').trim() || 'B.Tech CSE - 5th Semester';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Student full name must be at least 2 characters.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'A valid student email address is required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Student password must be at least 6 characters.' });
      return;
    }
    if (store.tables.profiles.some((p) => p.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const student: StoredProfile = {
      id: generateId(),
      email,
      passwordHash: hashPassword(password),
      fullName,
      avatarUrl: '',
      academicLevel,
      preferredSubjects: [
        'Data Structures & Algorithms',
        'Operating Systems',
        'Database Management Systems',
      ],
      role: 'student',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.tables.profiles.push(student);
    store.commit();
    store.logActivity({
      userId: student.id,
      activityType: 'login',
      title: 'Student account enrolled by Administrator',
      subject: 'Account',
    });

    res.status(201).json({ student: sanitizeProfile(student) });
  });

  app.patch('/api/admin/students/:id/status', requireAdmin, (req, res) => {
    const st = store.tables.profiles.find(
      (p) => p.id === req.params.id && p.role === 'student'
    );
    if (!st) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    st.isActive = Boolean(req.body?.isActive);
    st.updatedAt = new Date().toISOString();
    store.commit();
    res.json({ student: sanitizeProfile(st) });
  });

  app.patch('/api/admin/students/:id/password', requireAdmin, (req, res) => {
    const st = store.tables.profiles.find(
      (p) => p.id === req.params.id && p.role === 'student'
    );
    if (!st) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    const newPassword = String(req.body?.newPassword ?? '');
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New student password must be at least 6 characters.' });
      return;
    }
    st.passwordHash = hashPassword(newPassword);
    st.updatedAt = new Date().toISOString();
    store.commit();
    res.json({ message: `Password updated for ${st.fullName}.` });
  });

  app.delete('/api/admin/students/:id', requireAdmin, (req, res) => {
    const idx = store.tables.profiles.findIndex(
      (p) => p.id === req.params.id && p.role === 'student'
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    const studentId = store.tables.profiles[idx].id;
    store.tables.profiles.splice(idx, 1);

    const quizIds = new Set(
      store.tables.quizzes.filter((q) => q.userId === studentId).map((q) => q.id)
    );
    const attemptIds = new Set(
      store.tables.quiz_attempts
        .filter((a) => a.userId === studentId)
        .map((a) => a.id)
    );

    store.tables.chat_conversations = store.tables.chat_conversations.filter(
      (c) => c.userId !== studentId
    );
    store.tables.chat_messages = store.tables.chat_messages.filter(
      (m) => m.userId !== studentId
    );
    store.tables.saved_notes = store.tables.saved_notes.filter(
      (n) => n.userId !== studentId
    );
    store.tables.quizzes = store.tables.quizzes.filter(
      (q) => q.userId !== studentId
    );
    store.tables.quiz_questions = store.tables.quiz_questions.filter(
      (qq) => !quizIds.has(qq.quizId)
    );
    store.tables.quiz_attempts = store.tables.quiz_attempts.filter(
      (qa) => qa.userId !== studentId
    );
    store.tables.quiz_answers = store.tables.quiz_answers.filter(
      (ans) => !attemptIds.has(ans.attemptId)
    );
    store.tables.user_activity = store.tables.user_activity.filter(
      (act) => act.userId !== studentId
    );

    store.commit();
    res.json({ success: true });
  });

  app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const fullName = String(req.body?.fullName ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (fullName.length < 2 || !isValidEmail(email) || password.length < 8) {
      res.status(400).json({
        error: 'Administrator name, valid email, and password (minimum 8 characters) are required.',
      });
      return;
    }
    if (store.tables.profiles.some((p) => p.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const newAdmin: StoredProfile = {
      id: generateId(),
      email,
      passwordHash: hashPassword(password),
      fullName,
      avatarUrl: '',
      academicLevel: 'Faculty / Administration',
      preferredSubjects: [],
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    store.tables.profiles.push(newAdmin);
    store.commit();
    res.status(201).json({ admin: sanitizeProfile(newAdmin) });
  });

  app.put('/api/admin/account', requireAdmin, (req: AuthenticatedRequest, res) => {
    const admin = req.authUser!;
    const fullName = String(req.body?.fullName ?? admin.fullName).trim();
    const email = String(req.body?.email ?? admin.email).trim().toLowerCase();
    const newPassword = String(req.body?.newPassword ?? '');

    if (fullName.length < 2 || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid administrator name and email are required.' });
      return;
    }

    const duplicate = store.tables.profiles.find(
      (p) => p.email.toLowerCase() === email && p.id !== admin.id
    );
    if (duplicate) {
      res.status(409).json({ error: 'Another account already uses that email address.' });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      res.status(400).json({ error: 'New admin password must be at least 8 characters.' });
      return;
    }

    admin.fullName = fullName;
    admin.email = email;
    if (newPassword) {
      admin.passwordHash = hashPassword(newPassword);
    }
    admin.updatedAt = new Date().toISOString();
    store.commit();

    res.json({
      user: sanitizeProfile(admin),
      message: 'Administrator credentials updated successfully.',
    });
  });

  app.post('/api/admin/subjects', requireAdmin, (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const code = String(req.body?.code ?? '').trim().toUpperCase();
    const description = String(req.body?.description ?? '').trim();
    const semester = String(req.body?.semester ?? '5th Semester').trim();

    if (!name || !code) {
      res.status(400).json({ error: 'Subject name and course code are required.' });
      return;
    }

    const subj = {
      id: generateId(),
      name,
      code,
      description,
      semester,
      createdAt: new Date().toISOString(),
    };
    store.tables.subjects.push(subj);
    store.commit();
    res.status(201).json({ subject: subj });
  });

  app.delete('/api/admin/subjects/:id', requireAdmin, (req, res) => {
    const idx = store.tables.subjects.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    const subjId = store.tables.subjects[idx].id;
    store.tables.subjects.splice(idx, 1);
    store.tables.topics = store.tables.topics.filter((t) => t.subjectId !== subjId);
    store.commit();
    res.json({ success: true });
  });

  app.post('/api/admin/topics', requireAdmin, (req, res) => {
    const subjectId = String(req.body?.subjectId ?? '').trim();
    const title = String(req.body?.title ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    const validDiffs: QuizDifficulty[] = ['Easy', 'Medium', 'Hard'];
    const difficulty: QuizDifficulty = validDiffs.includes(req.body?.difficulty)
      ? req.body.difficulty
      : 'Medium';

    if (!subjectId || !title) {
      res.status(400).json({ error: 'Parent subject and topic title are required.' });
      return;
    }

    const topic = {
      id: generateId(),
      subjectId,
      title,
      difficulty,
      description,
      createdAt: new Date().toISOString(),
    };
    store.tables.topics.push(topic);
    store.commit();
    res.status(201).json({ topic });
  });

  app.delete('/api/admin/topics/:id', requireAdmin, (req, res) => {
    const idx = store.tables.topics.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Topic not found.' });
      return;
    }
    store.tables.topics.splice(idx, 1);
    store.commit();
    res.json({ success: true });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const updates: Record<string, string> =
      req.body?.settings && typeof req.body.settings === 'object'
        ? req.body.settings
        : {};
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      const existing = store.tables.platform_settings.find((s) => s.key === key);
      if (existing) {
        existing.value = String(value);
        existing.updatedAt = now;
      }
    }
    store.commit();
    res.json({ settings: store.tables.platform_settings });
  });

  // =========================================================================
  // 10. FRONTEND DEV MIDDLEWARE / PRODUCTION STATIC BUNDLE
  // =========================================================================
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `AI-Powered Student Learning Assistant running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
