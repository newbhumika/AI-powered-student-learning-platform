import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import type { ProgressAnalytics } from '../shared/types.ts';

export const ProgressTracker: React.FC = () => {
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiRequest<ProgressAnalytics>('/api/analytics')
      .then((res) => {
        if (mounted) setAnalytics(res);
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Unable to load progress analytics.'
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800/70" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800/70" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex items-start gap-3 text-red-700 dark:text-red-300">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Student Progress & Performance Analytics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          All metrics below are computed dynamically from your saved quiz evaluations and study activity records.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Quizzes Completed
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {analytics.totalQuizzesCompleted}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Average Percentage
          </p>
          <p className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-400 mt-2 tabular-nums">
            {analytics.totalQuizzesCompleted > 0
              ? `${analytics.averagePercentage}%`
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Highest Quiz Score
          </p>
          <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {analytics.totalQuizzesCompleted > 0
              ? `${analytics.highestScore}%`
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Correct MCQs Answered
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {analytics.totalCorrectAnswers} / {analytics.totalQuestionsAnswered}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-wise Performance */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
            Subject-Wise Quiz Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Average accuracy percentage across attempted subjects
          </p>

          {analytics.subjectPerformance.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 text-center px-6">
              Complete at least one quiz in the Quiz Generator to populate subject-wise accuracy bars.
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.subjectPerformance}
                  margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.15)"
                  />
                  <XAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1F24',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="averagePercentage"
                    name="Average %"
                    fill="#0D9488"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weekly Progress Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
            Weekly Learning Activity & Quiz Trend
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Study actions vs quizzes completed over the past 7 days
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analytics.weeklyProgress}
                margin={{ top: 8, right: 12, left: -18, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.15)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1F24',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="studyActivities"
                  name="Study Actions"
                  stroke="#0D9488"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="quizzesCompleted"
                  name="Quizzes Completed"
                  stroke="#0284C7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Quiz Results & Activity History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
            Recent Quiz Results
          </h3>

          {analytics.recentQuizResults.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
              No quiz results recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Topic</th>
                    <th className="py-2 px-3 font-medium">Subject</th>
                    <th className="py-2 px-3 font-medium text-right">Score</th>
                    <th className="py-2 pl-3 font-medium text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {analytics.recentQuizResults.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                        {r.topic}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {r.subject}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {r.score}/{r.totalQuestions}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono font-semibold tabular-nums text-teal-700 dark:text-teal-400">
                        {r.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
            Learning Activity History
          </h3>

          {analytics.activityHistory.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
              Your learning actions will appear here as you study.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
              {analytics.activityHistory.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {item.subject} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
