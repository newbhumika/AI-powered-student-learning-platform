import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  GraduationCap,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type {
  AdminOverviewData,
  QuizAttempt,
  QuizDifficulty,
  UserActivity,
  UserProfile,
} from '../shared/types.ts';

type AdminTab = 'overview' | 'students' | 'curriculum' | 'settings';

interface AdminPortalProps {
  onExitToHome: () => void;
  onSwitchToStudentPortal: () => void;
}

const ACADEMIC_LEVELS = [
  'B.Tech CSE - 5th Semester',
  'B.Tech CSE - 3rd / 4th Semester',
  'B.Tech CSE - Final Year',
  'BCA / B.Sc Computer Science',
  'M.Tech / MCA Postgraduate',
  'High School / Class 11-12 PCM',
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onExitToHome,
  onSwitchToStudentPortal,
}) => {
  const { user, updateLocalUser, logout, theme, toggleTheme, refreshPublicInfo } =
    useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Student search, enroll & inspect state
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollPassword, setEnrollPassword] = useState('');
  const [enrollLevel, setEnrollLevel] = useState(ACADEMIC_LEVELS[0]);

  const [inspectedStudent, setInspectedStudent] = useState<{
    student: UserProfile;
    attempts: QuizAttempt[];
    notesCount: number;
    notes?: {
      id: string;
      title: string;
      subject: string;
      noteType: string;
      updatedAt: string;
    }[];
    activities: UserActivity[];
  } | null>(null);
  const [resetStudentPwd, setResetStudentPwd] = useState('');
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(
    null
  );

  // New Subject & Topic inputs
  const [subjName, setSubjName] = useState('');
  const [subjCode, setSubjCode] = useState('');
  const [subjSemester, setSubjSemester] = useState('5th Semester');
  const [subjDesc, setSubjDesc] = useState('');

  const [topicSubjectId, setTopicSubjectId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDiff, setTopicDiff] = useState<QuizDifficulty>('Medium');
  const [topicDesc, setTopicDesc] = useState('');

  // Settings & Admin Account forms
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [adminAccountName, setAdminAccountName] = useState(user?.fullName || '');
  const [adminAccountEmail, setAdminAccountEmail] = useState(user?.email || '');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  const [coAdminName, setCoAdminName] = useState('');
  const [coAdminEmail, setCoAdminEmail] = useState('');
  const [coAdminPassword, setCoAdminPassword] = useState('');

  const fetchOverview = async () => {
    try {
      const res = await apiRequest<AdminOverviewData>('/api/admin/overview');
      setData(res);
      if (!topicSubjectId && res.subjects.length > 0) {
        setTopicSubjectId(res.subjects[0].id);
      }
      const map: Record<string, string> = {};
      for (const s of res.settings) {
        map[s.key] = s.value;
      }
      setSettingsForm(map);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load admin console.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStudentActive = async (
    studentId: string,
    nextActive: boolean
  ) => {
    try {
      await apiRequest(`/api/admin/students/${studentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleInspectStudent = async (studentId: string) => {
    try {
      const res = await apiRequest<{
        student: UserProfile;
        attempts: QuizAttempt[];
        notesCount: number;
        notes?: {
          id: string;
          title: string;
          subject: string;
          noteType: string;
          updatedAt: string;
        }[];
        activities: UserActivity[];
      }>(`/api/admin/students/${studentId}`);
      setInspectedStudent(res);
      setResetStudentPwd('');
      setConfirmDeleteStudentId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to inspect student.'
      );
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: enrollName,
          email: enrollEmail,
          password: enrollPassword,
          academicLevel: enrollLevel,
        }),
      });
      setEnrollName('');
      setEnrollEmail('');
      setEnrollPassword('');
      setShowEnrollForm(false);
      await fetchOverview();
      setNotice('New student account enrolled and ready for Student Sign In.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student.');
    }
  };

  const handleAdminResetStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedStudent) return;
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/admin/students/${inspectedStudent.student.id}/password`,
        {
          method: 'PATCH',
          body: JSON.stringify({ newPassword: resetStudentPwd }),
        }
      );
      setResetStudentPwd('');
      setNotice(res.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reset student password.'
      );
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await apiRequest(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });
      if (inspectedStudent?.student.id === studentId) {
        setInspectedStudent(null);
      }
      setConfirmDeleteStudentId(null);
      await fetchOverview();
      setNotice('Student account and associated records removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete student.');
    }
  };

  const handleUpdateAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ user: UserProfile; message: string }>(
        '/api/admin/account',
        {
          method: 'PUT',
          body: JSON.stringify({
            fullName: adminAccountName,
            email: adminAccountEmail,
            newPassword: adminNewPassword || undefined,
          }),
        }
      );
      updateLocalUser(res.user);
      setAdminNewPassword('');
      await fetchOverview();
      setNotice(res.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update admin account.'
      );
    }
  };

  const handleAddCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          fullName: coAdminName,
          email: coAdminEmail,
          password: coAdminPassword,
        }),
      });
      setCoAdminName('');
      setCoAdminEmail('');
      setCoAdminPassword('');
      await fetchOverview();
      setNotice('Additional Faculty Administrator added.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add administrator.'
      );
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: subjName,
          code: subjCode,
          semester: subjSemester,
          description: subjDesc,
        }),
      });
      setSubjName('');
      setSubjCode('');
      setSubjDesc('');
      await fetchOverview();
      await refreshPublicInfo();
      setNotice('Subject added to curriculum.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subject.');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await apiRequest(`/api/admin/subjects/${id}`, { method: 'DELETE' });
      await fetchOverview();
      await refreshPublicInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subject.');
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/topics', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: topicSubjectId,
          title: topicTitle,
          difficulty: topicDiff,
          description: topicDesc,
        }),
      });
      setTopicTitle('');
      setTopicDesc('');
      await fetchOverview();
      await refreshPublicInfo();
      setNotice('Topic added to curriculum.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add topic.');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await apiRequest(`/api/admin/topics/${id}`, { method: 'DELETE' });
      await fetchOverview();
      await refreshPublicInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete topic.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsForm }),
      });
      await fetchOverview();
      await refreshPublicInfo();
      setNotice('Platform settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  const filteredStudents =
    data?.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1013] text-slate-900 dark:text-slate-100 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1519] p-5 justify-between">
        <div>
          <div className="mb-8 px-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <Shield className="w-4 h-4" />
              <span>Admin Governance</span>
            </div>
            <p className="font-display text-base font-bold text-slate-900 dark:text-white mt-1">
              AI Learning Assistant
            </p>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview' as AdminTab, label: 'Platform Overview', icon: BarChart3 },
              { id: 'students' as AdminTab, label: 'Student Directory', icon: Users },
              { id: 'curriculum' as AdminTab, label: 'Subjects & Topics', icon: BookOpen },
              { id: 'settings' as AdminTab, label: 'Platform Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNotice(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-700 dark:bg-teal-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onSwitchToStudentPortal}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-600/10 transition-colors cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Login / Portal</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" />
                <span>Daylight Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                <span>Obsidian Dark Theme</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              onExitToHome();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="truncate">Sign Out ({user?.email})</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0D1519]/90 px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Admin Console /{' '}
            <span className="text-slate-900 dark:text-white font-semibold capitalize">
              {tab}
            </span>
          </div>

          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto">
            {(['overview', 'students', 'curriculum', 'settings'] as AdminTab[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-2.5 py-1 text-xs rounded capitalize cursor-pointer ${
                    tab === t
                      ? 'bg-teal-700 dark:bg-teal-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={onSwitchToStudentPortal}
              className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={onExitToHome}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
            >
              Home
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between text-sm text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{notice}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading || !data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Registered Students
                      </p>
                      <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                        {data.stats.totalStudents}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
                        Active accounts: {data.stats.activeStudents}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total Quizzes Attempted
                      </p>
                      <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                        {data.stats.totalQuizzesAttempted}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
                        Cohort avg: {data.stats.averagePlatformScore}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total AI Generations
                      </p>
                      <p className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-400 mt-2 tabular-nums">
                        {data.stats.totalAiRequests}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Across chat, explainer, quizzes & notes
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Saved Student Notes
                      </p>
                      <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                        {data.stats.totalSavedNotes}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
                        {data.subjects.length} curriculum subjects active
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
                      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
                        AI Module Usage Distribution
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                        Total server-side AI invocations per educational module
                      </p>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.stats.aiBreakdown}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(148, 163, 184, 0.15)"
                            />
                            <XAxis
                              dataKey="module"
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
                            <Bar
                              dataKey="count"
                              name="Requests"
                              fill="#0D9488"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6">
                      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-1">
                        Recent Student Learning Stream
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Real-time activity across registered students
                      </p>

                      {data.recentActivities.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                          No student learning sessions logged yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-56 overflow-y-auto">
                          {data.recentActivities.slice(0, 10).map((act) => (
                            <div key={act.id} className="py-2.5 first:pt-0">
                              <p className="text-xs font-medium text-slate-900 dark:text-white">
                                {act.studentName} — {act.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                {act.studentEmail} ·{' '}
                                {new Date(act.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDENT MANAGEMENT */}
              {tab === 'students' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                          Registered Students ({data.students.length})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Enroll new students, inspect learning records, reset passwords, or manage account access
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name or email..."
                            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowEnrollForm((prev) => !prev)}
                          className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{showEnrollForm ? 'Close Form' : 'Enroll Student'}</span>
                        </button>
                      </div>
                    </div>

                    {showEnrollForm && (
                      <form
                        onSubmit={handleEnrollStudent}
                        className="rounded-xl border border-teal-600/30 bg-[#F6F8FA] dark:bg-[#0A1013] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
                      >
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Student Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={enrollName}
                            onChange={(e) => setEnrollName(e.target.value)}
                            placeholder="Priya Nair"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10191E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Student Login Email
                          </label>
                          <input
                            type="email"
                            required
                            value={enrollEmail}
                            onChange={(e) => setEnrollEmail(e.target.value)}
                            placeholder="priya@university.edu"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10191E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Initial Password
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={enrollPassword}
                            onChange={(e) => setEnrollPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10191E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Academic Level
                          </label>
                          <select
                            value={enrollLevel}
                            onChange={(e) => setEnrollLevel(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10191E]"
                          >
                            {ACADEMIC_LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="py-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          Create Student Login
                        </button>
                      </form>
                    )}

                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                        No student accounts registered yet. Click &ldquo;Enroll Student&rdquo; above or use Student Registration.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                              <th className="py-2.5 pr-4 font-medium">Student</th>
                              <th className="py-2.5 px-3 font-medium">Level</th>
                              <th className="py-2.5 px-3 font-medium text-right">
                                Quizzes
                              </th>
                              <th className="py-2.5 px-3 font-medium text-right">
                                Avg Score
                              </th>
                              <th className="py-2.5 px-3 font-medium">Status</th>
                              <th className="py-2.5 pl-3 font-medium text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                            {filteredStudents.map((st) => (
                              <tr key={st.id}>
                                <td className="py-3 pr-4">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {st.fullName}
                                  </p>
                                  <p className="text-slate-500 dark:text-slate-400">
                                    {st.email}
                                  </p>
                                </td>
                                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                  {st.academicLevel}
                                </td>
                                <td className="py-3 px-3 text-right font-mono tabular-nums">
                                  {st.quizzesAttempted}
                                </td>
                                <td className="py-3 px-3 text-right font-mono tabular-nums">
                                  {st.quizzesAttempted > 0
                                    ? `${st.averageScore}%`
                                    : '—'}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={
                                      st.isActive
                                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                        : 'text-red-600 dark:text-red-400 font-medium'
                                    }
                                  >
                                    {st.isActive ? 'Active' : 'Suspended'}
                                  </span>
                                </td>
                                <td className="py-3 pl-3 text-right space-x-3 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleInspectStudent(st.id)}
                                    className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Inspect</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleStudentActive(st.id, !st.isActive)
                                    }
                                    className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                                  >
                                    {st.isActive ? 'Suspend' : 'Activate'}
                                  </button>
                                  {confirmDeleteStudentId === st.id ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStudent(st.id)}
                                        className="text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                                      >
                                        Confirm Delete
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteStudentId(null)}
                                        className="text-slate-500 hover:underline cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteStudentId(st.id)}
                                      className="text-red-600/80 dark:text-red-400/80 hover:text-red-600 hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Student Detail Drawer/Card */}
                  {inspectedStudent && (
                    <div className="rounded-xl border border-teal-500/40 bg-white dark:bg-[#10191E] p-6 space-y-5">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                          <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                            Student Activity & Credential Profile
                          </p>
                          <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                            {inspectedStudent.student.fullName} (
                            {inspectedStudent.student.email})
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {inspectedStudent.student.academicLevel} · Saved Notes:{' '}
                            {inspectedStudent.notesCount} · Preferred Subjects:{' '}
                            {inspectedStudent.student.preferredSubjects.join(', ') ||
                              'None'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInspectedStudent(null)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Admin Reset Student Password */}
                      <form
                        onSubmit={handleAdminResetStudentPassword}
                        className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A1013] p-3"
                      >
                        <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Reset Student Password:
                        </span>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={resetStudentPwd}
                          onChange={(e) => setResetStudentPwd(e.target.value)}
                          placeholder="New password (min 6 chars)"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10191E] flex-1 min-w-[180px]"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Set Password
                        </button>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                            Quiz Attempts ({inspectedStudent.attempts.length})
                          </h5>
                          {inspectedStudent.attempts.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No quizzes completed yet.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {inspectedStudent.attempts.map((a) => (
                                <div
                                  key={a.id}
                                  className="text-xs border-b border-slate-200 dark:border-slate-800 pb-2 tabular-nums"
                                >
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {a.topic}
                                  </span>{' '}
                                  · {a.score}/{a.totalQuestions} ({a.percentage}%)
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                            Saved Study Notes ({inspectedStudent.notesCount})
                          </h5>
                          {!inspectedStudent.notes ||
                          inspectedStudent.notes.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No study notes saved yet.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {inspectedStudent.notes.map((n) => (
                                <div
                                  key={n.id}
                                  className="text-xs border-b border-slate-200 dark:border-slate-800 pb-2"
                                >
                                  <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {n.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {n.subject} · {n.noteType}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h5 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                            Recent Learning Activity
                          </h5>
                          {inspectedStudent.activities.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No activity recorded.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {inspectedStudent.activities.map((act) => (
                                <div
                                  key={act.id}
                                  className="text-xs border-b border-slate-200 dark:border-slate-800 pb-2"
                                >
                                  <p className="text-slate-800 dark:text-slate-200">
                                    {act.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 tabular-nums">
                                    {new Date(act.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SUBJECTS & TOPICS MANAGEMENT */}
              {tab === 'curriculum' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subjects Column */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Manage Subjects ({data.subjects.length})
                    </h3>

                    <form onSubmit={handleAddSubject} className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Code (CS506)"
                          value={subjCode}
                          onChange={(e) => setSubjCode(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Subject Title"
                          value={subjName}
                          onChange={(e) => setSubjName(e.target.value)}
                          className="col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Semester"
                          value={subjSemester}
                          onChange={(e) => setSubjSemester(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                        <input
                          type="text"
                          placeholder="Short description"
                          value={subjDesc}
                          onChange={(e) => setSubjDesc(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subject</span>
                      </button>
                    </form>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto">
                      {data.subjects.map((s) => (
                        <div
                          key={s.id}
                          className="py-3 flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {s.code} · {s.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {s.semester} — {s.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(s.id)}
                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topics Column */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Manage Recommended Topics ({data.topics.length})
                    </h3>

                    <form onSubmit={handleAddTopic} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={topicSubjectId}
                          onChange={(e) => setTopicSubjectId(e.target.value)}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          {data.subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={topicDiff}
                          onChange={(e) =>
                            setTopicDiff(e.target.value as QuizDifficulty)
                          }
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Topic Title"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <input
                        type="text"
                        placeholder="Brief topic scope"
                        value={topicDesc}
                        onChange={(e) => setTopicDesc(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Topic</span>
                      </button>
                    </form>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto">
                      {data.topics.map((t) => {
                        const subj = data.subjects.find(
                          (s) => s.id === t.subjectId
                        );
                        return (
                          <div
                            key={t.id}
                            className="py-3 flex items-start justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {t.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {subj?.name || 'General'} · {t.difficulty}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(t.id)}
                              className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PLATFORM SETTINGS & ADMIN GOVERNANCE */}
              {tab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveSettings}
                    className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 space-y-5 h-fit"
                  >
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        Platform Governance Settings
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure institution branding, student self-registration, AI rate limits, and default quiz timing.
                      </p>
                    </div>

                    {data.settings.map((setting) => (
                      <div key={setting.key}>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                          {setting.key}
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                          {setting.description}
                        </p>
                        <input
                          type="text"
                          value={settingsForm[setting.key] ?? setting.value}
                          onChange={(e) =>
                            setSettingsForm((prev) => ({
                              ...prev,
                              [setting.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    ))}

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Platform Settings</span>
                    </button>
                  </form>

                  <div className="lg:col-span-5 space-y-6">
                    {/* Update Current Admin Credentials */}
                    <form
                      onSubmit={handleUpdateAdminAccount}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-4"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          My Administrator Credentials
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Update your administrator login email or set a custom password for Admin Portal sign-in.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Administrator Name
                        </label>
                        <input
                          type="text"
                          required
                          value={adminAccountName}
                          onChange={(e) => setAdminAccountName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Admin Sign-In Email
                        </label>
                        <input
                          type="email"
                          required
                          value={adminAccountEmail}
                          onChange={(e) => setAdminAccountEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          New Password (optional, min 8 chars)
                        </label>
                        <input
                          type="password"
                          minLength={8}
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                          placeholder="Leave blank to keep current password"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-lg bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Update Admin Account
                      </button>
                    </form>

                    {/* Add Co-Administrator */}
                    <form
                      onSubmit={handleAddCoAdmin}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-4"
                    >
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          Faculty Administrators ({data.admins?.length || 1})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Grant Admin Portal access to an additional faculty evaluator.
                        </p>
                      </div>

                      <div className="space-y-1.5 max-h-28 overflow-y-auto border-b border-slate-200 dark:border-slate-800 pb-3">
                        {(data.admins || []).map((adm) => (
                          <div
                            key={adm.id}
                            className="text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {adm.fullName}
                            </span>
                            <span className="text-slate-500">{adm.email}</span>
                          </div>
                        ))}
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="Faculty Name"
                        value={coAdminName}
                        onChange={(e) => setCoAdminName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                      />
                      <input
                        type="email"
                        required
                        placeholder="faculty@university.edu"
                        value={coAdminEmail}
                        onChange={(e) => setCoAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                      />
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="Admin Password (min 8 chars)"
                        value={coAdminPassword}
                        onChange={(e) => setCoAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013]"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Faculty Administrator</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
