import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type {
  Quiz,
  QuizAttempt,
  QuizAttemptDetail,
  QuizDifficulty,
} from '../shared/types.ts';
import type { PortalSearchDispatch } from './DashboardLayout.tsx';

type QuizStage = 'configure' | 'taking' | 'result';

interface QuizModuleProps {
  autoQuizRequest?: PortalSearchDispatch | null;
}

export const QuizModule: React.FC<QuizModuleProps> = ({ autoQuizRequest }) => {
  const { publicInfo } = useAuth();

  // Generator config
  const [subject, setSubject] = useState(
    publicInfo.subjects[0]?.name || 'Data Structures & Algorithms'
  );
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medium');

  // Stage & Active Quiz State
  const [stage, setStage] = useState<QuizStage>('configure');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [secondsLeft, setSecondsLeft] = useState(300);
  const startTimeRef = useRef<number>(0);
  const lastHandledNonce = useRef<number | null>(null);

  // Result & History
  const [resultDetail, setResultDetail] = useState<QuizAttemptDetail | null>(
    null
  );
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    setLoadingHistory(true);
    apiRequest<{ attempts: QuizAttempt[] }>('/api/quizzes')
      .then((res) => setPastAttempts(res.attempts))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Countdown Timer Effect
  useEffect(() => {
    if (stage !== 'taking' || !activeQuiz) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [stage, activeQuiz]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (stage === 'taking' && secondsLeft === 0 && activeQuiz && !submitting) {
      void handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, stage]);

  const runQuizGeneration = async (
    targetTopic: string,
    targetSubject?: string,
    targetDifficulty?: QuizDifficulty
  ) => {
    const cleanTopic = targetTopic.trim();
    if (!cleanTopic) return;
    const effectiveSubject =
      (targetSubject ?? subject).trim() || 'Computer Science & Engineering';
    const effectiveDiff = targetDifficulty ?? difficulty;

    setTopic(cleanTopic);
    setSubject(effectiveSubject);
    setDifficulty(effectiveDiff);
    setGenerating(true);
    setError(null);
    try {
      const res = await apiRequest<{ quiz: Quiz }>('/api/ai/generate-quiz', {
        method: 'POST',
        body: JSON.stringify({
          subject: effectiveSubject,
          topic: cleanTopic,
          questionCount,
          difficulty: effectiveDiff,
          questionType: 'MCQ',
        }),
      });

      setActiveQuiz(res.quiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setSecondsLeft(res.quiz.timeLimitSeconds || questionCount * 60);
      startTimeRef.current = Date.now();
      setStage('taking');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to generate quiz questions.'
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (
      autoQuizRequest &&
      autoQuizRequest.nonce !== lastHandledNonce.current
    ) {
      lastHandledNonce.current = autoQuizRequest.nonce;
      setStage('configure');
      void runQuizGeneration(autoQuizRequest.query, autoQuizRequest.subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuizRequest]);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    await runQuizGeneration(topic, subject, difficulty);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || submitting) return;
    setSubmitting(true);
    setError(null);

    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000)
    );

    try {
      const res = await apiRequest<{ result: QuizAttemptDetail }>(
        `/api/quizzes/${activeQuiz.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            answers: selectedAnswers,
            timeTakenSeconds: elapsedSec,
          }),
        }
      );
      setResultDetail(res.result);
      setStage('result');
      loadHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to evaluate quiz attempt.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectAttempt = async (attemptId: string) => {
    setError(null);
    try {
      const res = await apiRequest<{ result: QuizAttemptDetail }>(
        `/api/quiz-attempts/${attemptId}`
      );
      setResultDetail(res.result);
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load quiz result.');
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // =========================================================================
  // STAGE 2: INTERACTIVE QUIZ PLAYER
  // =========================================================================
  if (stage === 'taking' && activeQuiz && activeQuiz.questions) {
    const questions = activeQuiz.questions;
    const currentQ = questions[currentIndex];
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
      <div className="space-y-6">
        {/* Quiz Top Status Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeQuiz.subject} · {activeQuiz.difficulty} · MCQ Assessment
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {activeQuiz.topic}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border font-mono text-sm font-semibold tabular-nums ${
                secondsLeft <= 30
                  ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Quiz ({answeredCount}/{questions.length})</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Single Question Card */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="font-mono text-xs text-teal-700 dark:text-teal-400 mb-2 tabular-nums">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white leading-snug mb-6">
                {currentQ.questionText}
              </h3>

              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === optIdx;
                  const optionLetter = String.fromCharCode(65 + optIdx);
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: optIdx,
                        }))
                      }
                      className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-[#0A1013] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-md font-mono text-xs font-semibold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-teal-700 dark:bg-teal-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-sm leading-relaxed pt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Previous & Next Controls */}
            <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                  }
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Finish & Submit Quiz</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Palette Navigator */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 h-fit">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Question Navigator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 tabular-nums">
              {answeredCount} of {questions.length} answered
            </p>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg font-mono text-xs font-semibold transition-colors tabular-nums cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-teal-500 bg-teal-700 dark:bg-teal-600 text-white'
                        : isAnswered
                        ? 'bg-teal-600/20 text-teal-800 dark:text-teal-300 border border-teal-500/40'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 3: DETAILED EVALUATION RESULT PAGE
  // =========================================================================
  if (stage === 'result' && resultDetail) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quiz Evaluation Report · {resultDetail.subject} ·{' '}
                {resultDetail.difficulty}
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {resultDetail.topic}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setStage('configure');
                setResultDetail(null);
                setActiveQuiz(null);
              }}
              className="px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Generate Another Quiz</span>
            </button>
          </div>

          {/* Score Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Final Score
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {resultDetail.score} / {resultDetail.totalQuestions}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accuracy Percentage
              </p>
              <p className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
                {resultDetail.percentage}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Incorrect / Unanswered
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {resultDetail.totalQuestions - resultDetail.score}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Time Taken
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatTimer(resultDetail.timeTakenSeconds)}
              </p>
            </div>
          </div>
        </div>

        {/* Question-by-Question Review */}
        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Detailed Question & Answer Review
          </h3>

          {resultDetail.questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <h4 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {idx + 1}. {q.questionText}
                </h4>
                {q.isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
                    <XCircle className="w-4 h-4" />
                    <span>
                      {q.selectedOptionIndex === -1 ? 'Unanswered' : 'Incorrect'}
                    </span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, optIdx) => {
                  const isCorrectOpt = optIdx === q.correctOptionIndex;
                  const isUserWrongChoice =
                    optIdx === q.selectedOptionIndex && !q.isCorrect;
                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        isCorrectOpt
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-medium'
                          : isUserWrongChoice
                          ? 'border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="font-mono font-semibold shrink-0">
                        {letter}.
                      </span>
                      <div className="flex-1">
                        <span>{opt}</span>
                        {isCorrectOpt && (
                          <span className="block text-[11px] font-semibold mt-0.5 text-emerald-700 dark:text-emerald-300">
                            ✓ Correct Answer
                          </span>
                        )}
                        {isUserWrongChoice && (
                          <span className="block text-[11px] font-semibold mt-0.5 text-red-700 dark:text-red-300">
                            ✗ Your Selection
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-[#0A1013] border border-slate-200 dark:border-slate-800 p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-white">
                  Explanation:{' '}
                </strong>
                {q.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 1: QUIZ GENERATOR CONFIGURATION + PAST ATTEMPTS
  // =========================================================================
  return (
    <div className="space-y-8">
      <form
        onSubmit={handleGenerateQuiz}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            AI Multiple-Choice Quiz Generator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure your subject, topic, question count, and difficulty—or click any quick pick—to launch a timed interactive assessment.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subject
            </label>
            <input
              type="text"
              list="quiz-subjects"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <datalist id="quiz-subjects">
              {publicInfo.subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Topic to Evaluate
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., AVL Tree Rotations & Time Complexity"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Questions
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {[5, 10, 15, 20].map((cnt) => (
                <option key={cnt} value={cnt}>
                  {cnt} Questions (MCQ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Instant quiz topics:
            </span>
            {publicInfo.topics.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={generating}
                onClick={() => {
                  const parentSubj = publicInfo.subjects.find(
                    (s) => s.id === t.subjectId
                  );
                  void runQuizGeneration(
                    t.title,
                    parentSubj?.name || subject,
                    t.difficulty
                  );
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:border-teal-600/60 hover:bg-teal-600/5 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t.title}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={generating || !topic.trim()}
            className="px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating {questionCount} MCQs...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Timed Quiz</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Past Quiz Attempts Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
          Completed Quiz Evaluations
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Click any completed attempt to review your answers and explanations
        </p>

        {loadingHistory ? (
          <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        ) : pastAttempts.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
            You have not completed any quizzes yet. Generate your first quiz above to evaluate your knowledge.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Topic & Subject</th>
                  <th className="py-2.5 px-4 font-medium">Difficulty</th>
                  <th className="py-2.5 px-4 font-medium text-right">Score</th>
                  <th className="py-2.5 px-4 font-medium text-right">Percentage</th>
                  <th className="py-2.5 px-4 font-medium text-right">Date</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {pastAttempts.map((att) => (
                  <tr
                    key={att.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {att.topic}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {att.subject}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {att.difficulty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-800 dark:text-slate-200">
                      {att.score}/{att.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                      {att.percentage}%
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {new Date(att.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectAttempt(att.id)}
                        className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        Review Answers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
