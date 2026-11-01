import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type {
  ChatMode,
  NoteType,
  QuizDifficulty,
  StructuredNoteContent,
  TopicExplanationContent,
} from '../shared/types.ts';

export class AIConfigError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 503) {
    super(message);
    this.name = 'AIConfigError';
    this.statusCode = statusCode;
  }
}

function resolveGeminiApiKey(): string | undefined {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (
      trimmed &&
      trimmed !== 'MY_GEMINI_API_KEY' &&
      trimmed !== 'YOUR_GEMINI_API_KEY' &&
      trimmed.length > 10
    ) {
      return trimmed;
    }
  }
  return undefined;
}

export function isAiConfigured(): boolean {
  return Boolean(resolveGeminiApiKey());
}

function getGenAIClient(timeoutMs = 25000): GoogleGenAI {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new AIConfigError(
      'AI backend is awaiting server configuration. Please ensure GEMINI_API_KEY is set in Settings > Secrets.',
      503
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: Math.max(10000, timeoutMs),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Executes a Gemini generation request using fast low-latency primary model
 * ('gemini-3.1-flash-lite') with automatic fallback to 'gemini-3.8-flash'
 * if transient upstream timeouts or 5xx errors occur.
 */
async function generateWithFallback(
  params: Omit<GenerateContentParameters, 'model'>
): Promise<GenerateContentResponse> {
  const modelChain: {
    model: string;
    timeoutMs: number;
    extraConfig?: Record<string, unknown>;
  }[] = [
    {
      model: 'gemini-3.1-flash-lite',
      timeoutMs: 25000,
    },
    {
      model: 'gemini-3.8-flash',
      timeoutMs: 28000,
      extraConfig: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    },
  ];

  let lastError: unknown = null;

  for (const candidate of modelChain) {
    try {
      const ai = getGenAIClient(candidate.timeoutMs);
      const mergedConfig = {
        ...(params.config ?? {}),
        ...(candidate.extraConfig ?? {}),
      };
      const response = await ai.models.generateContent({
        model: candidate.model,
        contents: params.contents,
        config: mergedConfig,
      });

      if (response.text && response.text.trim().length > 0) {
        return response;
      }
      lastError = new Error(`Empty response from model ${candidate.model}`);
    } catch (err) {
      lastError = err;
      if (err instanceof AIConfigError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
        throw err;
      }
      console.warn(
        `[AI Fallback] Model ${candidate.model} failed (${msg.slice(0, 140)}). Trying next candidate...`
      );
    }
  }

  throw lastError ?? new Error('All AI model candidates failed to respond.');
}

function parseJsonResponse<T>(rawText: string | undefined, fallbackJson: string): T {
  const cleaned = (rawText ?? fallbackJson)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned || fallbackJson) as T;
}

export function normalizeAiError(err: unknown): { status: number; message: string } {
  if (err instanceof AIConfigError) {
    return { status: err.statusCode, message: err.message };
  }
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('403')
  ) {
    return {
      status: 503,
      message:
        'Invalid or unauthorized AI API credentials on the server. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message:
        'AI API quota or rate limit reached. Please wait a few seconds and try your search again.',
    };
  }
  if (rawMessage.includes('DEADLINE_EXCEEDED') || rawMessage.includes('504')) {
    return {
      status: 504,
      message:
        'The AI model took too long to respond. Please click search/generate once more to retry.',
    };
  }
  return {
    status: 500,
    message: 'Unable to complete AI generation right now. Please retry your request.',
  };
}

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  beginner:
    'Explain Like a Beginner: Use clear everyday analogies, simple vocabulary, intuition-first explanations, and concrete examples before introducing technical notation.',
  detailed:
    'Detailed Explanation: Provide a comprehensive university-level explanation covering theoretical foundations, formal definitions, edge cases, complexity/trade-offs, and practical examples.',
  short:
    'Short Answer: Deliver a concise, high-signal 3-to-6 sentence answer directly addressing the question with one crisp example if helpful.',
  exam:
    'Exam Preparation: Structure the answer for maximum university exam marks—start with a formal 2-line definition, list structured key points, include a worked example or diagram-in-text, and finish with common exam pitfalls.',
  step_by_step:
    'Step-by-Step Explanation: Break the concept, derivation, or problem down into numbered sequential steps, clearly explaining the transition and reasoning behind every step.',
};

/**
 * Multi-turn AI Study Assistant response generator
 */
export async function generateStudyChatReply(params: {
  history: { role: 'user' | 'assistant'; content: string }[];
  prompt: string;
  mode: ChatMode;
  academicLevel: string;
}): Promise<string> {
  const modeDirective = MODE_INSTRUCTIONS[params.mode] || MODE_INSTRUCTIONS.detailed;

  const recentTurns = params.history.slice(-10);
  const formattedContents = [
    ...recentTurns.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: params.prompt }],
    },
  ];

  const response = await generateWithFallback({
    contents: formattedContents,
    config: {
      systemInstruction: `You are an expert, encouraging academic professor and AI Study Tutor for ${params.academicLevel} students.
Response Mode Requirement: ${modeDirective}
Formatting guidelines:
- Format output in clean, readable Markdown (headings, bullet lists, bold key terms, fenced code blocks when showing algorithms/queries).
- Always remain accurate, pedagogically clear, and grounded in established academic knowledge.`,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Empty response received from AI model.');
  }
  return text;
}

/**
 * Structured AI Topic Explainer generator
 */
export async function generateTopicExplanation(params: {
  subject: string;
  topic: string;
  academicLevel: string;
  difficulty: string;
}): Promise<{ structured: TopicExplanationContent; markdown: string }> {
  const response = await generateWithFallback({
    contents: `Create a thorough academic topic explanation for:
Subject: ${params.subject}
Topic: ${params.topic}
Academic Level: ${params.academicLevel}
Explanation Difficulty: ${params.difficulty}`,
    config: {
      systemInstruction:
        'You are a university curriculum specialist. Produce an accurate, clear, deeply educational topic breakdown tailored to the requested academic level and difficulty.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          introduction: {
            type: Type.STRING,
            description: 'Engaging 1-2 paragraph overview of what the topic is and why it matters.',
          },
          detailedExplanation: {
            type: Type.STRING,
            description: 'Thorough multi-paragraph conceptual and technical explanation.',
          },
          importantPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '5 to 7 essential takeaways or properties.',
          },
          practicalExamples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                scenario: { type: Type.STRING },
                walkthrough: { type: Type.STRING },
              },
              required: ['title', 'scenario', 'walkthrough'],
            },
            description: '2 to 3 concrete real-world or computational examples.',
          },
          keyDefinitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
              },
              required: ['term', 'definition'],
            },
            description: '4 to 6 formal academic definitions.',
          },
          revisionSummary: {
            type: Type.STRING,
            description: 'Concise quick-revision paragraph before exams.',
          },
          faqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
              },
              required: ['question', 'answer'],
            },
            description: '3 to 4 frequently asked student or viva questions with answers.',
          },
        },
        required: [
          'introduction',
          'detailedExplanation',
          'importantPoints',
          'practicalExamples',
          'keyDefinitions',
          'revisionSummary',
          'faqs',
        ],
      },
    },
  });

  const parsed = parseJsonResponse<
    Omit<TopicExplanationContent, 'subject' | 'topic' | 'academicLevel' | 'difficulty'>
  >(response.text, '{}');

  const structured: TopicExplanationContent = {
    subject: params.subject,
    topic: params.topic,
    academicLevel: params.academicLevel,
    difficulty: params.difficulty,
    introduction: parsed.introduction || '',
    detailedExplanation: parsed.detailedExplanation || '',
    importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [],
    practicalExamples: Array.isArray(parsed.practicalExamples)
      ? parsed.practicalExamples
      : [],
    keyDefinitions: Array.isArray(parsed.keyDefinitions) ? parsed.keyDefinitions : [],
    revisionSummary: parsed.revisionSummary || '',
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
  };

  const markdown = [
    `# ${params.topic}`,
    `**Subject:** ${params.subject} | **Level:** ${params.academicLevel} | **Difficulty:** ${params.difficulty}`,
    '',
    '## 1. Introduction',
    structured.introduction,
    '',
    '## 2. Detailed Explanation',
    structured.detailedExplanation,
    '',
    '## 3. Important Points',
    ...structured.importantPoints.map((pt) => `- ${pt}`),
    '',
    '## 4. Key Definitions',
    ...structured.keyDefinitions.map((d) => `- **${d.term}:** ${d.definition}`),
    '',
    '## 5. Practical Examples',
    ...structured.practicalExamples.flatMap((ex) => [
      `### ${ex.title}`,
      `*Scenario:* ${ex.scenario}`,
      '',
      ex.walkthrough,
      '',
    ]),
    '## 6. Quick Revision Summary',
    structured.revisionSummary,
    '',
    '## 7. Frequently Asked Questions',
    ...structured.faqs.flatMap((f) => [`**Q: ${f.question}**`, `A: ${f.answer}`, '']),
  ].join('\n');

  return { structured, markdown };
}

/**
 * Structured AI MCQ Quiz Generator
 */
export async function generateQuizQuestions(params: {
  subject: string;
  topic: string;
  questionCount: number;
  difficulty: QuizDifficulty;
  academicLevel: string;
}): Promise<
  {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }[]
> {
  const response = await generateWithFallback({
    contents: `Generate exactly ${params.questionCount} multiple-choice questions (MCQs) on:
Subject: ${params.subject}
Topic: ${params.topic}
Difficulty: ${params.difficulty}
Student Level: ${params.academicLevel}

Rules:
- Every question MUST have exactly 4 distinct options (indices 0, 1, 2, 3).
- Do NOT prefix options with "A.", "B.", "C.", "D." inside the option string itself.
- Ensure correctOptionIndex is an integer 0, 1, 2, or 3 matching the unambiguously correct option.
- Provide a clear academic explanation justifying why the correct answer is right and why common distractors fail.`,
    config: {
      systemInstruction:
        'You are a university examination setter creating rigorous, unambiguous multiple-choice questions.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of exactly 4 answer options.',
            },
            correctOptionIndex: {
              type: Type.INTEGER,
              description: '0-based index (0 to 3) of the correct option.',
            },
            explanation: {
              type: Type.STRING,
              description: 'Detailed explanation of the correct answer.',
            },
          },
          required: ['questionText', 'options', 'correctOptionIndex', 'explanation'],
        },
      },
    },
  });

  const parsed = parseJsonResponse<
    {
      questionText: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
    }[]
  >(response.text, '[]');

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Failed to generate valid quiz questions.');
  }

  return parsed.slice(0, params.questionCount).map((q) => {
    const cleanOptions = (q.options || []).slice(0, 4);
    while (cleanOptions.length < 4) {
      cleanOptions.push(`Option ${cleanOptions.length + 1}`);
    }
    const safeIdx =
      typeof q.correctOptionIndex === 'number' &&
      q.correctOptionIndex >= 0 &&
      q.correctOptionIndex <= 3
        ? q.correctOptionIndex
        : 0;

    return {
      questionText: q.questionText,
      options: cleanOptions,
      correctOptionIndex: safeIdx,
      explanation: q.explanation || 'Refer to core principles of this topic.',
    };
  });
}

const NOTE_TYPE_DESCRIPTIONS: Record<Exclude<NoteType, 'topic_explanation'>, string> = {
  short:
    'Short Notes: Crisp, high-yield condensed notes focusing on essential formulas, core definitions, and rapid recall.',
  detailed:
    'Detailed Notes: Comprehensive lecture-grade study notes with thorough conceptual depth, derivations/mechanisms, and full examples.',
  exam:
    'Exam-Oriented Notes: Structured specifically for scoring high in university semester exams—formal definitions, comparison points, step-by-step mechanisms, and key scoring highlights.',
  bullet:
    'Bullet-Point Revision Notes: Fast-scanning last-minute revision sheet organized around crisp, memorable bullet points.',
};

/**
 * Structured AI Study Notes Generator
 */
export async function generateStudyNotes(params: {
  subject: string;
  topic: string;
  noteType: Exclude<NoteType, 'topic_explanation'>;
  academicLevel: string;
}): Promise<{ structured: StructuredNoteContent; markdown: string }> {
  const styleDesc = NOTE_TYPE_DESCRIPTIONS[params.noteType] || NOTE_TYPE_DESCRIPTIONS.detailed;

  const response = await generateWithFallback({
    contents: `Generate structured academic study notes for:
Subject: ${params.subject}
Topic: ${params.topic}
Academic Level: ${params.academicLevel}
Note Format: ${styleDesc}`,
    config: {
      systemInstruction:
        'You are an academic study guide author creating well-structured, accurate university study notes.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING, description: 'Clear academic title of the notes.' },
          introduction: { type: Type.STRING, description: 'Concise topic overview.' },
          importantDefinitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
              },
              required: ['term', 'definition'],
            },
          },
          mainConcepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['title', 'explanation'],
            },
          },
          examples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 concrete examples illustrating the topic.',
          },
          importantPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Key exam/revision points to remember.',
          },
          summary: {
            type: Type.STRING,
            description: 'Synthesizing wrap-up paragraph.',
          },
        },
        required: [
          'heading',
          'introduction',
          'importantDefinitions',
          'mainConcepts',
          'examples',
          'importantPoints',
          'summary',
        ],
      },
    },
  });

  const structured = parseJsonResponse<StructuredNoteContent>(response.text, '{}');

  const markdown = [
    `# ${structured.heading || params.topic}`,
    `**Subject:** ${params.subject} | **Format:** ${params.noteType.toUpperCase()} NOTES`,
    '',
    '## Introduction',
    structured.introduction || '',
    '',
    '## Important Definitions',
    ...(structured.importantDefinitions || []).map(
      (d) => `- **${d.term}:** ${d.definition}`
    ),
    '',
    '## Main Concepts',
    ...(structured.mainConcepts || []).flatMap((c) => [
      `### ${c.title}`,
      c.explanation,
      '',
    ]),
    '## Examples',
    ...(structured.examples || []).map((ex, i) => `${i + 1}. ${ex}`),
    '',
    '## Important Points for Revision',
    ...(structured.importantPoints || []).map((pt) => `- ${pt}`),
    '',
    '## Summary',
    structured.summary || '',
  ].join('\n');

  return { structured, markdown };
}
