import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
  LogIn,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserProfile } from '../shared/types.ts';

export type AuthScreenMode = 'login' | 'register' | 'forgot' | 'admin';

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
  const { user, establishSession, publicInfo } = useAuth();
  const [mode, setMode] = useState<AuthScreenMode>(initialMode);
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [academicLevel, setAcademicLevel] = useState(ACADEMIC_LEVELS[0]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Data Structures & Algorithms',
    'Operating Systems',
    'Database Management Systems',
  ]);

  // Forgot password states
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetCode, setResetCode] = useState('');
  const [generatedDemoCode, setGeneratedDemoCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode]);

  useEffect(() => {
    if (mode === 'admin') {
      apiRequest<{ configured: boolean }>('/api/admin/status')
        .then((res) => setAdminConfigured(res.configured))
        .catch(() => setAdminConfigured(true));
    }
  }, [mode]);

  const toggleSubject = (subjName: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjName)
        ? prev.filter((s) => s !== subjName)
        : [...prev, subjName]
    );
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
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
            password,
            academicLevel,
            preferredSubjects: selectedSubjects,
          }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        message: string;
        verificationCode?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessMsg(res.message);
      if (res.verificationCode) {
        setGeneratedDemoCode(res.verificationCode);
        setResetCode(res.verificationCode);
      }
      setResetStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          code: resetCode,
          newPassword,
        }),
      });
      setSuccessMsg(res.message);
      setPassword('');
      setGeneratedDemoCode(null);
      setResetStep('request');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        adminConfigured === false ? '/api/admin/setup' : '/api/admin/login';
      const payload =
        adminConfigured === false
          ? { fullName: fullName || 'Platform Administrator', email, password }
          : { email, password };

      const res = await apiRequest<{ token: string; user: UserProfile }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxAccess = async (targetRole: 'student' | 'admin') => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>(
        '/api/auth/sandbox-session',
        {
          method: 'POST',
          body: JSON.stringify({ role: targetRole }),
        }
      );
      establishSession(res.token, res.user);
      onAuthenticated(res.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to start session.'
      );
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
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'login' || mode === 'forgot'
                ? 'bg-white dark:bg-[#17242B] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Student Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#17242B] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
              setSuccessMsg(null);
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
              Signed in as <strong>{user.fullName}</strong> ({user.role}). Sign in below to switch accounts.
            </span>
            <button
              type="button"
              onClick={() => onAuthenticated(user)}
              className="font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Resume Session
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

          {successMsg && (
            <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{successMsg}</p>
                {generatedDemoCode && mode === 'forgot' && (
                  <p className="mt-1 font-mono text-xs">
                    Verification Code: <strong>{generatedDemoCode}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MODE: STUDENT LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="mb-2">
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Welcome back, Student
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Sign in to access your study assistant, saved notes, and quiz history.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setResetStep('request');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Sign In to Student Dashboard</span>
              </button>

              {publicInfo.sandboxQuickAccess !== false && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSandboxAccess('student')}
                    className="w-full py-2.5 px-4 rounded-lg border border-teal-600/40 bg-teal-600/10 hover:bg-teal-600/15 text-teal-800 dark:text-teal-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Instant Demo Student Login (Aarav Sharma · CSE 5th Sem)</span>
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    New here?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className="text-teal-700 dark:text-teal-400 font-medium hover:underline cursor-pointer"
                    >
                      Create your own Student Account
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* MODE: STUDENT REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleStudentRegister} className="space-y-4">
              <div className="mb-2">
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Create Student Account
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Personalize your academic level and subjects for tailored explanations.
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
                  Password (minimum 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
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
                <span>Create Student Account</span>
              </button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Account Password Recovery
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {resetStep === 'request'
                    ? 'Enter your registered student email to generate a 6-digit recovery code.'
                    : 'Enter your 6-digit verification code and choose a new password.'}
                </p>
              </div>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Registered Student Email
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
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    <span>Request Recovery Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetConfirm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* MODE: ADMIN PORTAL */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="mb-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Faculty & System Governance</span>
                </div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {adminConfigured === false
                    ? 'Initialize First Administrator'
                    : 'Administrator Sign In'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {adminConfigured === false
                    ? 'No ADMIN_EMAIL environment variable was detected. Complete this one-time secure setup to create the administrator account.'
                    : 'Enter your administrator credentials to manage students, subjects, and platform settings.'}
                </p>
              </div>

              {adminConfigured === false && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Administrator Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Rajesh Verma"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Password {adminConfigured === false ? '(min 8 chars)' : ''}
                </label>
                <input
                  type="password"
                  required
                  minLength={adminConfigured === false ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || adminConfigured === null}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {adminConfigured === false
                    ? 'Create Administrator & Enter Console'
                    : 'Sign In to Admin Console'}
                </span>
              </button>

              {publicInfo.sandboxQuickAccess !== false && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSandboxAccess('admin')}
                    className="w-full py-2.5 px-4 rounded-lg border border-teal-600/40 bg-teal-600/10 hover:bg-teal-600/15 text-teal-800 dark:text-teal-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Instant Demo Admin Console (Faculty Oversight)</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
        Powered by persistent server-side document storage, scrypt password hashing, and role-verified session tokens.
      </p>
    </div>
  );
};
