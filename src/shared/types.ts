/**
 * Shared TypeScript types for AI-Powered Student Learning Assistant
 */

export type UserRole = 'student' | 'admin';

export type ChatMode =
  | 'beginner'
  | 'detailed'
  | 'short'
  | 'exam'
  | 'step_by_step';

export type NoteType =
  | 'short'
  | 'detailed'
  | 'exam'
  | 'bullet'
  | 'topic_explanation';

export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  academicLevel: string;
  preferredSubjects: string[];
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  semester: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  difficulty: QuizDifficulty;
  description: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  mode: ChatMode;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  mode: ChatMode;
  createdAt: string;
}

export interface TopicExplanationContent {
  subject: string;
  topic: string;
  academicLevel: string;
  difficulty: string;
  introduction: string;
  detailedExplanation: string;
  importantPoints: string[];
  practicalExamples: {
    title: string;
    scenario: string;
    walkthrough: string;
  }[];
  keyDefinitions: {
    term: string;
    definition: string;
  }[];
  revisionSummary: string;
  faqs: {
    question: string;
    answer: string;
  }[];
}

export interface StructuredNoteContent {
  heading: string;
  introduction: string;
  importantDefinitions: {
    term: string;
    definition: string;
  }[];
  mainConcepts: {
    title: string;
    explanation: string;
  }[];
  examples: string[];
  importantPoints: string[];
  summary: string;
}

export interface SavedNote {
  id: string;
  userId: string;
  title: string;
  subject: string;
  topic: string;
  noteType: NoteType;
  structuredContent?: StructuredNoteContent | TopicExplanationContent;
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionIndex: number;
  questionText: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  difficulty: QuizDifficulty;
  questionType: 'MCQ';
  questionCount: number;
  timeLimitSeconds: number;
  createdAt: string;
  questions?: QuizQuestion[];
}

export interface QuizAnswerRecord {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  subject: string;
  topic: string;
  difficulty: QuizDifficulty;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  completedAt: string;
  createdAt: string;
}

export interface QuizAttemptDetail extends QuizAttempt {
  questions: {
    id: string;
    questionIndex: number;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface UserActivity {
  id: string;
  userId: string;
  activityType:
    | 'chat_message'
    | 'topic_explained'
    | 'quiz_completed'
    | 'note_generated'
    | 'login'
    | 'ai_request';
  title: string;
  subject: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalQuizzesAttempted: number;
  averageQuizScore: number;
  highestQuizScore: number;
  totalStudySessions: number;
  totalSavedNotes: number;
  totalConversations: number;
  recentActivities: UserActivity[];
  weeklyProgress: {
    day: string;
    date: string;
    sessions: number;
    avgScore: number;
  }[];
}

export interface ProgressAnalytics {
  totalQuizzesCompleted: number;
  averagePercentage: number;
  highestScore: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  subjectPerformance: {
    subject: string;
    attempts: number;
    averagePercentage: number;
    highestPercentage: number;
  }[];
  recentQuizResults: QuizAttempt[];
  activityHistory: UserActivity[];
  weeklyProgress: {
    day: string;
    date: string;
    quizzesCompleted: number;
    studyActivities: number;
    averagePercentage: number;
  }[];
}

export interface AdminOverviewData {
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalQuizzesAttempted: number;
    averagePlatformScore: number;
    totalAiRequests: number;
    totalSavedNotes: number;
    aiBreakdown: {
      module: string;
      count: number;
    }[];
  };
  students: (UserProfile & {
    quizzesAttempted: number;
    averageScore: number;
    notesCount: number;
    lastActiveAt: string | null;
  })[];
  recentActivities: (UserActivity & {
    studentName: string;
    studentEmail: string;
  })[];
  subjects: Subject[];
  topics: Topic[];
  settings: PlatformSetting[];
  admins: UserProfile[];
}

