import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  LineChart as LineChartIcon,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { DashboardSummary } from '../shared/types.ts';

export type StudentTab =
  | 'overview'
  | 'assistant'
  | 'explainer'
  | 'quiz'
  | 'notes'
  | 'progress'
  | 'profile';

interface StudentDashboardProps {
  onNavigateTab: (tab: StudentTab) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigateTab,
}) => {
  const { user, publicInfo } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<DashboardSummary>('/api/dashboard')
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Unable to load dashboard summary.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800/70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800/70"
            />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800/70" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 flex items-start gap-3 text-red-700 dark:text-red-300">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Failed to load dashboard</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* AI Configuration Notice if server lacks API key */}
      {!publicInfo.aiConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">AI API Key Not Configured on Server</p>
            <p className="text-xs mt-0.5 opacity-90">
              Configure <code className="font-mono">GEMINI_API_KEY</code> in the AI Studio Secrets panel or server <code className="font-mono">.env</code> file to enable live AI generation.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.academicLevel} · {publicInfo.institutionName}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('assistant')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <span>Ask AI Study Tutor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Real Database KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Quizzes Attempted
          </p>
          <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-2 tabular-nums">
            {data.totalQuizzesAttempted}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Highest score: <span className="tabular-nums">{data.highestQuizScore}%</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Average Quiz Score
          </p>
          <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-2 tabular-nums">
            {data.totalQuizzesAttempted > 0 ? `${data.averageQuizScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {data.totalQuizzesAttempted > 0
              ? `Across ${data.totalQuizzesAttempted} graded evaluation${
                  data.totalQuizzesAttempted === 1 ? '' : 's'
                }`
              : 'Complete your first quiz to compute'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Study Sessions
          </p>
          <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-2 tabular-nums">
            {data.totalStudySessions}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Chats, explanations, notes & quizzes
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saved Notes & Explanations
          </p>
          <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-2 tabular-nums">
            {data.totalSavedNotes}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {data.totalConversations} active tutor conversation
            {data.totalConversations === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Quick Access AI Tools */}
      <div>
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-3">
          Quick Access AI Learning Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              tab: 'assistant' as StudentTab,
              title: 'AI Study Assistant',
              desc: 'Ask academic questions in 5 adaptive modes.',
              icon: MessageSquare,
            },
            {
              tab: 'explainer' as StudentTab,
              title: 'Topic Explainer',
              desc: 'Generate definitions, examples & viva FAQs.',
              icon: BookOpen,
            },
            {
              tab: 'quiz' as StudentTab,
              title: 'Quiz Generator',
              desc: 'Take timed 5–20 question MCQ tests.',
              icon: CheckSquare,
            },
            {
              tab: 'notes' as StudentTab,
              title: 'Notes & PDF Builder',
              desc: 'Create, edit, and export PDF study sheets.',
              icon: FileText,
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.tab}
                type="button"
                onClick={() => onNavigateTab(tool.tab)}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] hover:border-teal-600/60 dark:hover:border-teal-500/60 p-5 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart + Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Learning Progress Chart */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                7-Day Study Consistency
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daily completed AI study sessions over the past week
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('progress')}
              className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Full Analytics</span>
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.weeklyProgress}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.18)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
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
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Study Sessions"
                  stroke="#0D9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sessionsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 flex flex-col">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
            Recent Learning Activity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Live log of your study sessions and quiz evaluations
          </p>

          {data.recentActivities.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No study sessions recorded yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Ask your first question in the AI Study Assistant or generate a topic quiz to start building your timeline.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('explainer')}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors cursor-pointer"
              >
                Explore a Topic
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {data.recentActivities.slice(0, 6).map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                    {act.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {act.subject} ·{' '}
                    {new Date(act.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
