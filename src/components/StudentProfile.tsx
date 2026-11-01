import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Save,
  Upload,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserProfile } from '../shared/types.ts';
import defaultStudentAvatar from '../assets/images/avatar_student_default_1793520279196.jpg';

const ACADEMIC_LEVELS = [
  'B.Tech CSE - 5th Semester',
  'B.Tech CSE - 3rd / 4th Semester',
  'B.Tech CSE - Final Year',
  'BCA / B.Sc Computer Science',
  'M.Tech / MCA Postgraduate',
  'High School / Class 11-12 PCM',
];

export const StudentProfile: React.FC = () => {
  const { user, updateLocalUser, publicInfo } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [academicLevel, setAcademicLevel] = useState(
    user?.academicLevel || ACADEMIC_LEVELS[0]
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>(
    user?.preferredSubjects || []
  );
  const [imgError, setImgError] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const toggleSubject = (name: string) => {
    setPreferredSubjects((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setProfileNotice({
        type: 'error',
        text: 'Profile photo must be smaller than 1 MB.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setImgError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          academicLevel,
          avatarUrl,
          preferredSubjects,
        }),
      });
      updateLocalUser(res.user);
      setProfileNotice({
        type: 'success',
        text: 'Student profile updated successfully.',
      });
    } catch (err) {
      setProfileNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword !== confirmPassword) {
      setPasswordNotice({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiRequest<{ message: string }>(
        '/api/profile/password',
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ type: 'success', text: res.message });
    } catch (err) {
      setPasswordNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Password update failed.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const displayedAvatar = avatarUrl || defaultStudentAvatar;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Profile Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Student Academic Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal details, academic level, profile photo, and preferred subjects.
          </p>
        </div>

        {profileNotice && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-start gap-2.5 text-xs ${
              profileNotice.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}
          >
            {profileNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{profileNotice.text}</span>
          </div>
        )}

        {/* Avatar Picker */}
        <div className="flex flex-wrap items-center gap-5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-teal-600/20 flex items-center justify-center shrink-0">
            {!imgError ? (
              <img
                src={displayedAvatar}
                alt={`${fullName || 'Student'} profile avatar`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-lg font-bold text-teal-700 dark:text-teal-300">
                {(fullName || 'S').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              PNG or JPG up to 1 MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Student Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Registered Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Academic Level
          </label>
          <select
            value={academicLevel}
            onChange={(e) => setAcademicLevel(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
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
          <div className="flex flex-wrap gap-2">
            {availableSubjects.map((subj) => {
              const selected = preferredSubjects.includes(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => toggleSubject(subj)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                    selected
                      ? 'border-teal-600 bg-teal-600/15 text-teal-800 dark:text-teal-300 font-medium'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
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
          disabled={savingProfile}
          className="px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          {savingProfile ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Profile Settings</span>
        </button>
      </form>

      {/* Password Update Card */}
      <form
        onSubmit={handleUpdatePassword}
        className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 space-y-4 h-fit"
      >
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Security & Password Update
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify your current password to set a new account password.
          </p>
        </div>

        {passwordNotice && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-start gap-2.5 text-xs ${
              passwordNotice.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}
          >
            {passwordNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{passwordNotice.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            New Password (min 6 characters)
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {savingPassword ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          <span>Update Password</span>
        </button>
      </form>
    </div>
  );
};
