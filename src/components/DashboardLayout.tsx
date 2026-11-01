import React, { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  FileText,
  Home,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Shield,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentDashboard, type StudentTab } from './StudentDashboard.tsx';
import { StudyAssistant } from './StudyAssistant.tsx';
import { TopicExplainer } from './TopicExplainer.tsx';
import { QuizModule } from './QuizModule.tsx';
import { NotesGenerator } from './NotesGenerator.tsx';
import { ProgressTracker } from './ProgressTracker.tsx';
import { StudentProfile } from './StudentProfile.tsx';
import defaultStudentAvatar from '../assets/images/avatar_student_default_1793520279196.jpg';

interface DashboardLayoutProps {
  onBackToLanding: () => void;
  onSwitchToAdminPortal: () => void;
}

const NAV_ITEMS: {
  id: StudentTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Study Assistant', icon: MessageSquare },
  { id: 'explainer', label: 'Topic Explainer', icon: BookOpen },
  { id: 'quiz', label: 'Quiz Generator', icon: CheckSquare },
  { id: 'notes', label: 'Study Notes', icon: FileText },
  { id: 'progress', label: 'Progress Tracker', icon: LineChart },
  { id: 'profile', label: 'Student Profile', icon: User },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  onBackToLanding,
  onSwitchToAdminPortal,
}) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const activeLabel =
    NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Dashboard';

  const handleSelectTab = (tab: StudentTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex flex-col justify-between h-full p-5">
      <div>
        <div className="flex items-center justify-between px-2 mb-8">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-left cursor-pointer"
          >
            <p className="font-display text-base font-bold text-slate-900 dark:text-white">
              AI Learning Assistant
            </p>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
              Student Workspace
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 dark:bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          type="button"
          onClick={onSwitchToAdminPortal}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-600/10 transition-colors cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          <span>Admin Portal</span>
        </button>

        <button
          type="button"
          onClick={onBackToLanding}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Public Home Page</span>
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
            onBackToLanding();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Secure Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1013] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1519] sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white dark:bg-[#0D1519] border-r border-slate-200 dark:border-slate-800 h-full">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0D1519]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
              Student Portal /{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {activeLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectTab('profile')}
            className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {user?.fullName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {user?.academicLevel}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-teal-600/20 flex items-center justify-center">
              {!avatarFailed ? (
                <img
                  src={user?.avatarUrl || defaultStudentAvatar}
                  alt={user?.fullName || 'Student'}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  {(user?.fullName || 'S').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <StudentDashboard onNavigateTab={handleSelectTab} />
          )}
          {activeTab === 'assistant' && <StudyAssistant />}
          {activeTab === 'explainer' && <TopicExplainer />}
          {activeTab === 'quiz' && <QuizModule />}
          {activeTab === 'notes' && <NotesGenerator />}
          {activeTab === 'progress' && <ProgressTracker />}
          {activeTab === 'profile' && <StudentProfile />}
        </main>
      </div>
    </div>
  );
};
