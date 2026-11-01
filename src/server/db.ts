import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  UserProfile,
  Subject,
  Topic,
  ChatConversation,
  ChatMessage,
  SavedNote,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizAnswerRecord,
  UserActivity,
  PlatformSetting,
} from '../shared/types.ts';

export interface StoredProfile extends UserProfile {
  passwordHash: string;
  resetCode?: string | null;
  resetCodeExpiresAt?: string | null;
}

export interface StoredQuizQuestion extends QuizQuestion {
  correctOptionIndex: number;
  explanation: string;
}

export interface DatabaseSchema {
  profiles: StoredProfile[];
  subjects: Subject[];
  topics: Topic[];
  chat_conversations: ChatConversation[];
  chat_messages: ChatMessage[];
  saved_notes: SavedNote[];
  quizzes: Quiz[];
  quiz_questions: StoredQuizQuestion[];
  quiz_attempts: QuizAttempt[];
  quiz_answers: QuizAnswerRecord[];
  user_activity: UserActivity[];
  platform_settings: PlatformSetting[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export function generateId(): string {
  return crypto.randomUUID();
}

function getInitialCurriculum(): {
  subjects: Subject[];
  topics: Topic[];
  settings: PlatformSetting[];
} {
  const now = new Date().toISOString();

  const subjects: Subject[] = [
    {
      id: 'subj-dsa',
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      description: 'Trees, graphs, dynamic programming, asymptotic complexity, and hashing.',
      semester: '3rd - 5th Semester',
      createdAt: now,
    },
    {
      id: 'subj-os',
      name: 'Operating Systems',
      code: 'CS501',
      description: 'Process scheduling, concurrency, deadlocks, virtual memory, and file systems.',
      semester: '5th Semester',
      createdAt: now,
    },
    {
      id: 'subj-dbms',
      name: 'Database Management Systems',
      code: 'CS502',
      description: 'Relational algebra, SQL normalization, ACID transactions, indexing, and concurrency.',
      semester: '5th Semester',
      createdAt: now,
    },
    {
      id: 'subj-cn',
      name: 'Computer Networks',
      code: 'CS503',
      description: 'OSI & TCP/IP layers, routing algorithms, congestion control, and network security.',
      semester: '5th Semester',
      createdAt: now,
    },
    {
      id: 'subj-toc',
      name: 'Theory of Computation',
      code: 'CS504',
      description: 'Finite automata, regular expressions, context-free grammars, and Turing machines.',
      semester: '5th Semester',
      createdAt: now,
    },
    {
      id: 'subj-ai',
      name: 'Artificial Intelligence & ML',
      code: 'CS505',
      description: 'Search heuristics, knowledge representation, supervised learning, and neural networks.',
      semester: '5th - 6th Semester',
      createdAt: now,
    },
  ];

  const topics: Topic[] = [
    {
      id: 'top-1',
      subjectId: 'subj-dsa',
      title: 'AVL Trees and Red-Black Tree Rotations',
      difficulty: 'Medium',
      description: 'Self-balancing binary search trees and O(log n) rebalancing operations.',
      createdAt: now,
    },
    {
      id: 'top-2',
      subjectId: 'subj-dsa',
      title: 'Dynamic Programming: Optimal Substructure & Memoization',
      difficulty: 'Hard',
      description: 'Knapsack, Longest Common Subsequence, and state transition design.',
      createdAt: now,
    },
    {
      id: 'top-3',
      subjectId: 'subj-os',
      title: "Deadlock Avoidance & Banker's Algorithm",
      difficulty: 'Medium',
      description: 'Safe state verification, resource allocation graphs, and recovery.',
      createdAt: now,
    },
    {
      id: 'top-4',
      subjectId: 'subj-os',
      title: 'Paging, TLB, and Virtual Memory Page Replacement',
      difficulty: 'Medium',
      description: 'FIFO, Optimal, and LRU page replacement policies and thrashing.',
      createdAt: now,
    },
    {
      id: 'top-5',
      subjectId: 'subj-dbms',
      title: 'Database Normalization (1NF, 2NF, 3NF, BCNF)',
      difficulty: 'Medium',
      description: 'Functional dependencies, lossless-join decomposition, and anomaly elimination.',
      createdAt: now,
    },
    {
      id: 'top-6',
      subjectId: 'subj-cn',
      title: 'TCP Three-Way Handshake & Congestion Control',
      difficulty: 'Medium',
      description: 'Slow start, congestion avoidance, fast retransmit, and sliding window.',
      createdAt: now,
    },
    {
      id: 'top-7',
      subjectId: 'subj-toc',
      title: 'Deterministic vs Non-Deterministic Finite Automata',
      difficulty: 'Easy',
      description: 'Subset construction, epsilon closures, and DFA minimization.',
      createdAt: now,
    },
    {
      id: 'top-8',
      subjectId: 'subj-ai',
      title: 'A* Search Algorithm & Admissible Heuristics',
      difficulty: 'Medium',
      description: 'Informed graph search, optimality conditions, and heuristic consistency.',
      createdAt: now,
    },
  ];

  const settings: PlatformSetting[] = [
    {
      key: 'institution_name',
      value: 'Department of Computer Science & Engineering',
      description: 'Academic institution or department displayed across reports and handouts.',
      updatedAt: now,
    },
    {
      key: 'allow_student_registration',
      value: 'true',
      description: 'Allow new students to self-register on the platform (true/false).',
      updatedAt: now,
    },
    {
      key: 'ai_rate_limit_per_minute',
      value: '20',
      description: 'Maximum AI generation requests allowed per user per minute.',
      updatedAt: now,
    },
    {
      key: 'default_quiz_seconds_per_question',
      value: '60',
      description: 'Default countdown timer allocation (in seconds) per MCQ question.',
      updatedAt: now,
    },
  ];

  return { subjects, topics, settings };
}

class DocumentStore {
  data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromDisk();
  }

  loadFromDisk(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        const seed = getInitialCurriculum();
        return {
          profiles: parsed.profiles ?? [],
          subjects: parsed.subjects?.length ? parsed.subjects : seed.subjects,
          topics: parsed.topics?.length ? parsed.topics : seed.topics,
          chat_conversations: parsed.chat_conversations ?? [],
          chat_messages: parsed.chat_messages ?? [],
          saved_notes: parsed.saved_notes ?? [],
          quizzes: parsed.quizzes ?? [],
          quiz_questions: parsed.quiz_questions ?? [],
          quiz_attempts: parsed.quiz_attempts ?? [],
          quiz_answers: parsed.quiz_answers ?? [],
          user_activity: parsed.user_activity ?? [],
          platform_settings: parsed.platform_settings?.length
            ? parsed.platform_settings
            : seed.settings,
        };
      }
    } catch (err) {
      console.error('Database initialization warning, creating clean state:', err);
    }

    const seed = getInitialCurriculum();
    const initial: DatabaseSchema = {
      profiles: [],
      subjects: seed.subjects,
      topics: seed.topics,
      chat_conversations: [],
      chat_messages: [],
      saved_notes: [],
      quizzes: [],
      quiz_questions: [],
      quiz_attempts: [],
      quiz_answers: [],
      user_activity: [],
      platform_settings: seed.settings,
    };
    this.persistToDisk(initial);
    return initial;
  }

  persistToDisk(snapshot: DatabaseSchema = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database snapshot:', err);
    }
  }

  get tables(): DatabaseSchema {
    return this.data;
  }

  commit(): void {
    this.persistToDisk();
  }

  getSetting(key: string, fallback: string): string {
    const found = this.data.platform_settings.find((s) => s.key === key);
    return found ? found.value : fallback;
  }

  logActivity(params: {
    userId: string;
    activityType: UserActivity['activityType'];
    title: string;
    subject?: string;
    metadata?: Record<string, unknown>;
  }): UserActivity {
    const record: UserActivity = {
      id: generateId(),
      userId: params.userId,
      activityType: params.activityType,
      title: params.title,
      subject: params.subject || 'General',
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };
    this.data.user_activity.unshift(record);
    this.commit();
    return record;
  }
}

export const store = new DocumentStore();

export function sanitizeProfile(profile: StoredProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    academicLevel: profile.academicLevel,
    preferredSubjects: profile.preferredSubjects,
    role: profile.role,
    isActive: profile.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
