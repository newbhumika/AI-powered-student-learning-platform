/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthViews, type AuthScreenMode } from './components/AuthViews.tsx';
import { DashboardLayout } from './components/DashboardLayout.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';

type TopView = 'landing' | 'auth' | 'workspace';

const AppRouter: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<TopView>('landing');
  const [authMode, setAuthMode] = useState<AuthScreenMode>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1013] flex items-center justify-center">
        <div className="inline-flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-teal-700 dark:text-teal-400" />
          <span>Loading AI-Powered Student Learning Assistant...</span>
        </div>
      </div>
    );
  }

  if (view === 'workspace' && user) {
    if (user.role === 'admin') {
      return (
        <AdminPortal
          onExitToHome={() => setView('landing')}
          onSwitchToStudentPortal={() => {
            setAuthMode('login');
            setView('auth');
          }}
        />
      );
    }
    return (
      <DashboardLayout
        onBackToLanding={() => setView('landing')}
        onSwitchToAdminPortal={() => {
          setAuthMode('admin');
          setView('auth');
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthViews
        initialMode={authMode}
        onBackToLanding={() => setView('landing')}
        onAuthenticated={() => setView('workspace')}
      />
    );
  }

  return (
    <LandingPage
      onNavigateAuth={(mode) => {
        if (mode === 'admin' && user?.role === 'admin') {
          setView('workspace');
          return;
        }
        if (mode === 'login' && user?.role === 'student') {
          setView('workspace');
          return;
        }
        setAuthMode(mode);
        setView('auth');
      }}
      onEnterWorkspace={() => {
        if (user) {
          setView('workspace');
        } else {
          setAuthMode('login');
          setView('auth');
        }
      }}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
