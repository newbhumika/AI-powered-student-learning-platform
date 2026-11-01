import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserPlus,
  LogIn,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserProfile } from '../shared/types.ts';

export type AuthScreenMode = 'login' | 'register' | 'admin';

interface AuthViewsProps {
  initialMode: AuthScreenMode;
  onBackToLanding: () => void;
  onAuthenticated: (profile: UserProfile) => void;
}

const ACADEMIC_LEVELS = [
  'B.Tech CSE - 5th Semester',
  'B.Tech CSE - 3rd / 4th Semester',
  'B.Tech CSE - Final Year',
  'BCA / B.Sc Computer Science',
  'M.Tech / MCA Postgraduate',
  'High School / Class 11-12 PCM',
];

export const AuthViews: React.FC<AuthViewsProps> = ({
  initialMode,
  onBackToLanding,
  onAuthenticated,
}) => {
  const { user, establishSession, enterPortalPasswordless, publicInfo } = useAuth();
  const [mode, setMode] = useState<AuthScreenMode>(initialMode);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [academicLevel, setAcademicLevel] = useState(ACADEMIC_LEVELS[0]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Data Structures & Algorithms',
    'Operating Systems',
    'Database Management Systems',
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  const toggleSubject = (subjName: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjName)
        ? prev.filter((s) => s !== subjName)
        : [...prev, subjName]
    );
  };

  const handleDirectRoleOpen = async (role: 'student' | 'admin') => {
    setError(null);
    setSubmitting(true);
    try {
      const profile = await enterPortalPasswordless(role);
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open portal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentEmailOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, fullName }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open student account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email,
            academicLevel,
            preferredSubjects: selectedSubjects,
          }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create student profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminEmailOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/admin/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, fullName }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open Admin Portal.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableSubjects =
    publicInfo.subjects.length > 0
      ? publicInfo.subjects.map((s) => s.name)
      : [
          'Data Structures & Algorithms',
          'Operating Systems',
          'Database Management Systems',
          'Computer Networks',
          'Theory of Computation',
          'Artificial Intelligence & ML',
        ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1013] text-slate-900 dark:text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Segmented Portal Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-200/80 dark:bg-[#10191E] border border-slate-200 dark:border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#17242B] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Student Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#17242B] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Student
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'admin'
                ? 'bg-white dark:bg-[#17242B] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Admin Portal
          </button>
        </div>

        {user && (
          <div className="mb-4 rounded-xl border border-teal-600/30 bg-teal-600/10 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between gap-3">
            <span>
              Active session: <strong>{user.fullName}</strong> ({user.role})
            </span>
            <button
              type="button"
              onClick={() => onAuthenticated(user)}
              className="font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Open Workspace
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 sm:p-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* MODE: PASSWORDLESS STUDENT ACCESS */}
          {mode === 'login' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Open Student Portal
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  No password required. Jump straight in or enter a student email to load or create a dedicated study workspace.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDirectRoleOpen('student')}
                className="w-full py-3 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>Instant Open · Student Dashboard</span>
              </button>

              <div className="relative py-1 flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="px-3 bg-white dark:bg-[#10191E] text-[11px] text-slate-400 whitespace-nowrap">
                  or switch by student email (no password)
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>

              <form onSubmit={handleStudentEmailOpen} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Student Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Continue with Student Email</span>
                </button>
              </form>
            </div>
          )}

          {/* MODE: PASSWORDLESS STUDENT PROFILE CREATION */}
          {mode === 'register' && (
            <form onSubmit={handleStudentRegister} className="space-y-4">
              <div className="mb-2">
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Create Student Profile
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Personalize your name, semester level, and preferred subjects—no password needed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Student Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Class / Academic Level
                </label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {ACADEMIC_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preferred Subjects
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSubjects.map((subj) => {
                    const active = selectedSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubject(subj)}
                        className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'border-teal-600 bg-teal-600/15 text-teal-800 dark:text-teal-300 font-medium'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !publicInfo.allowRegistration}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Create Profile & Open Student Portal</span>
              </button>
            </form>
          )}

          {/* MODE: PASSWORDLESS ADMIN PORTAL */}
          {mode === 'admin' && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Faculty & System Governance</span>
                </div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Open Admin Portal
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  No password required. Enter the Administrator Console immediately to manage students, curriculum subjects, and platform settings.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleDirectRoleOpen('admin')}
                className="w-full py-3 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Instant Open · Admin Governance Console</span>
              </button>

              <div className="relative py-1 flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="px-3 bg-white dark:bg-[#10191E] text-[11px] text-slate-400 whitespace-nowrap">
                  or enter with specific faculty email (no password)
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>

              <form onSubmit={handleAdminEmailOpen} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Faculty / Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="faculty@university.edu"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Continue with Admin Email</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
        Open passwordless access enabled for both Student Portal and Admin Governance Console.
      </p>
    </div>
  );
};
