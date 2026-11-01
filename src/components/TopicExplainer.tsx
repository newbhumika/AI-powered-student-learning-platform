import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  BookmarkPlus,
  Download,
  Loader2,
  Search,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { downloadStudyNotesPdf } from '../lib/pdfExport.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { TopicExplanationContent } from '../shared/types.ts';
import type { PortalSearchDispatch } from './DashboardLayout.tsx';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced / University Exam'];

interface TopicExplainerProps {
  autoSearchRequest?: PortalSearchDispatch | null;
}

export const TopicExplainer: React.FC<TopicExplainerProps> = ({
  autoSearchRequest,
}) => {
  const { user, publicInfo } = useAuth();
  const [subject, setSubject] = useState(
    publicInfo.subjects[0]?.name || 'Operating Systems'
  );
  const [topic, setTopic] = useState('');
  const [academicLevel, setAcademicLevel] = useState(
    user?.academicLevel || 'B.Tech CSE - 5th Semester'
  );
  const [difficulty, setDifficulty] = useState('Intermediate');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    structured: TopicExplanationContent;
    markdown: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastHandledNonce = useRef<number | null>(null);

  const suggestedTopics = publicInfo.topics.filter((t) => {
    const subjObj = publicInfo.subjects.find((s) => s.id === t.subjectId);
    return !subjObj || subjObj.name.toLowerCase() === subject.toLowerCase();
  });

  const displayTopics =
    suggestedTopics.length > 0 ? suggestedTopics : publicInfo.topics;

  const runExplanation = async (
    targetTopic: string,
    targetSubject?: string,
    targetDifficulty?: string
  ) => {
    const cleanTopic = targetTopic.trim();
    if (!cleanTopic) return;
    const effectiveSubject =
      (targetSubject ?? subject).trim() || 'Computer Science & Engineering';
    const effectiveDifficulty = targetDifficulty ?? difficulty;

    setTopic(cleanTopic);
    setSubject(effectiveSubject);
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await apiRequest<{
        structured: TopicExplanationContent;
        markdown: string;
      }>('/api/ai/explain-topic', {
        method: 'POST',
        body: JSON.stringify({
          subject: effectiveSubject,
          topic: cleanTopic,
          academicLevel: academicLevel.trim() || 'B.Tech CSE - 5th Semester',
          difficulty: effectiveDifficulty,
        }),
      });
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to generate topic explanation.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      autoSearchRequest &&
      autoSearchRequest.nonce !== lastHandledNonce.current
    ) {
      lastHandledNonce.current = autoSearchRequest.nonce;
      void runExplanation(autoSearchRequest.query, autoSearchRequest.subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchRequest]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runExplanation(topic, subject, difficulty);
  };

  const handleSaveExplanation = async () => {
    if (!result || saved || saving) return;
    setSaving(true);
    try {
      await apiRequest('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${result.structured.topic} (Topic Explanation)`,
          subject: result.structured.subject,
          topic: result.structured.topic,
          noteType: 'topic_explanation',
          structuredContent: result.structured,
          markdownContent: result.markdown,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save explanation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            AI Topic Explainer & Concept Search
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search any syllabus topic—or click a quick topic below—to receive a structured 7-part breakdown with definitions, worked examples, revision summary, and viva FAQs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subject
            </label>
            <input
              type="text"
              list="explainer-subjects"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Operating Systems"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <datalist id="explainer-subjects">
              {publicInfo.subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Search Topic Name
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Virtual Memory & Thrashing"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Class / Academic Level
            </label>
            <input
              type="text"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Explanation Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {displayTopics.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Instant syllabus topics:
              </span>
              {displayTopics.slice(0, 4).map((t) => {
                const parentSubj = publicInfo.subjects.find(
                  (s) => s.id === t.subjectId
                );
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void runExplanation(t.title, parentSubj?.name || subject)
                    }
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:border-teal-600/60 hover:bg-teal-600/5 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Topic Breakdown...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search & Explain Topic</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-8 space-y-4 animate-pulse">
          <div className="h-7 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {/* Structured Output */}
      {result && !loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {result.structured.subject} · {result.structured.academicLevel} ·{' '}
                {result.structured.difficulty}
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {result.structured.topic}
              </h2>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSaveExplanation}
                disabled={saved || saving}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-70"
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Saved to Notes</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Explanation'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadStudyNotesPdf({
                    title: result.structured.topic,
                    subject: result.structured.subject,
                    noteType: 'Topic Explanation',
                    markdownContent: result.markdown,
                    studentName: user?.fullName,
                    institutionName: publicInfo.institutionName,
                  })
                }
                className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* 1. Introduction */}
          <section>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-2">
              01. Topic Introduction
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {result.structured.introduction}
            </p>
          </section>

          {/* 2. Detailed Explanation */}
          <section>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-2">
              02. Detailed Explanation
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {result.structured.detailedExplanation}
            </p>
          </section>

          {/* 3. Key Definitions & 4. Important Points */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            <section>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
                03. Key Definitions
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                {result.structured.keyDefinitions.map((def) => (
                  <div key={def.term} className="py-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {def.term}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {def.definition}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
                04. Important Points
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {result.structured.importantPoints.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-teal-700 dark:text-teal-400 mt-0.5 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 5. Practical Examples */}
          <section>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
              05. Practical & Computational Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.structured.practicalExamples.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1215] p-4"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ex.title}
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
                    Scenario: {ex.scenario}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed whitespace-pre-line">
                    {ex.walkthrough}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Short Revision Summary */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1215] p-5">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              06. Short Revision Summary
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.structured.revisionSummary}
            </p>
          </section>

          {/* 7. Frequently Asked Questions */}
          <section>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
              07. Frequently Asked Exam & Viva Questions
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
              {result.structured.faqs.map((faq, i) => (
                <div key={i} className="py-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Q{i + 1}. {faq.question}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
