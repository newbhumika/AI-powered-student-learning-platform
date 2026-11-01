import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  GraduationCap,
  LineChart,
  LogIn,
  Menu,
  Moon,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ProjectReportModal } from './ProjectReportModal.tsx';
import heroWorkspaceImg from '../assets/images/hero_student_workspace_1793520277416.jpg';
import featureArchImg from '../assets/images/feature_concept_architecture_1793520278487.jpg';

interface LandingPageProps {
  onOpenStudentPortal: () => void;
  onOpenAdminPortal: () => void;
  onNavigateAuth: (mode: 'login' | 'register' | 'admin') => void;
  onEnterWorkspace: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenStudentPortal,
  onOpenAdminPortal,
  onNavigateAuth,
  onEnterWorkspace,
}) => {
  const { user, theme, toggleTheme, publicInfo } = useAuth();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [featureImgFailed, setFeatureImgFailed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 dark:bg-[#0A1013] dark:text-slate-100 flex flex-col">
      {/* 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-[#0A1013]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            AI Learning Assistant
          </a>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#portals"
              className="hover:text-teal-700 dark:hover:text-teal-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Portals
            </a>
            <a
              href="#features"
              className="hover:text-teal-700 dark:hover:text-teal-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-teal-700 dark:hover:text-teal-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="hover:text-teal-700 dark:hover:text-teal-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Portal
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {user.role === 'admin' ? 'Admin Console' : 'Student Portal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStudentPortal}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Student Portal
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Menu Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1519] px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onOpenStudentPortal();
                }}
                className="py-2.5 px-3 text-xs font-semibold rounded-lg bg-teal-700 text-white text-center cursor-pointer"
              >
                Open Student Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onOpenAdminPortal();
                }}
                className="py-2.5 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-center cursor-pointer"
              >
                Open Admin Portal
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateAuth('register');
              }}
              className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 text-center cursor-pointer"
            >
              Create Custom Student Profile (No Password Needed)
            </button>
          </div>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A1013]">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.10),transparent_55%)]" />
          <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              {/* Left Column: Academic Value Proposition */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-4">
                  AI-Powered Student Learning Assistant · B.Tech CSE Academic Platform
                </p>

                <h1 className="font-display font-bold tracking-tight text-slate-900 dark:text-white text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.12] text-balance mb-6">
                  Master university coursework through structured AI study workflows.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mb-8 leading-relaxed">
                  Break down complex engineering subjects, converse with a multi-mode AI tutor, test yourself with timed multiple-choice evaluations, and compile downloadable PDF revision notes—all backed by empirical progress tracking.
                </p>

                <div className="flex flex-wrap items-center gap-3 mb-10">
                  <button
                    type="button"
                    onClick={onOpenStudentPortal}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Open Student Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAdminPortal}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-teal-800 dark:text-teal-300 bg-teal-600/10 hover:bg-teal-600/15 border border-teal-600/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Open Admin Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Custom Student Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>5 Adaptive Tutor Modes</span>
                  <span aria-hidden="true">·</span>
                  <span>Timed MCQ Evaluations</span>
                  <span aria-hidden="true">·</span>
                  <span>Structured PDF Study Notes</span>
                  <span aria-hidden="true">·</span>
                  <span>Live Analytics</span>
                </div>
              </div>

              {/* Right Column: Editorial Hero Visual */}
              <div className="lg:col-span-6 flex">
                <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[320px] lg:min-h-[440px]">
                  {!heroImgFailed ? (
                    <img
                      src={heroWorkspaceImg}
                      alt="University computer science student studying at an architectural library desk at twilight"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0D2624] via-[#0F1F24] to-[#0A1013] text-center">
                      <GraduationCap className="w-12 h-12 text-teal-400 mb-3" />
                      <p className="font-display font-semibold text-white text-lg">
                        AI-Powered Student Learning Workspace
                      </p>
                      <p className="text-sm text-slate-400 mt-1 max-w-sm">
                        Concept explanations, interactive MCQ testing, and downloadable study notes in one unified environment.
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-6">
                    <div className="w-full">
                      <p className="text-xs text-teal-300 font-medium mb-1">
                        {publicInfo.institutionName}
                      </p>
                      <p className="text-sm text-slate-100 font-medium">
                        Designed for rigorous semester preparation across Data Structures, Operating Systems, DBMS, Computer Networks, and AI.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEDICATED PORTALS ACCESS HUB (STUDENT LOGIN & ADMIN CONSOLE) */}
        <section
          id="portals"
          className="py-16 border-b border-slate-200 dark:border-slate-800/80 bg-[#F6F8FA] dark:bg-[#0D1519]"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-2">
                Role-Based Access Portals
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                Dedicated workspaces for Students and Faculty Administrators.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Portal Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Portal 01 · Learner Workspace
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Student Learning Portal
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                    Enter immediately with one click—no password needed—to access the 5-mode AI Study Assistant, structured Topic Explainer, timed MCQ Quiz Engine, PDF Study Notes, and personal Progress Analytics.
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Instant Passwordless Access · Custom Student Profiles · Personal Study History
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenStudentPortal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Open Student Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Switch / Create Student Profile</span>
                  </button>
                </div>
              </div>

              {/* Admin Portal Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Portal 02 · Governance & Oversight
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Administrator & Faculty Console
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                    Open the administrative console directly with zero password required to monitor registered students, enroll new learners, inspect individual quiz scores and saved notes, curate CSE subjects & topics, and manage platform settings.
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Instant Passwordless Access · Student Enrollment & Inspection · Curriculum CRUD
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenAdminPortal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Open Admin Portal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES / ASYMMETRIC BENTO GRID */}
        <section
          id="features"
          className="py-20 border-b border-slate-200 dark:border-slate-800/80"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-2">
                Core Platform Modules
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                Every stage of academic comprehension in a single workspace.
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Marquee Span-2 Card */}
              <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      01. Multi-Mode AI Study Assistant & Topic Explainer
                    </p>
                    <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-3">
                      Switch seamlessly from beginner intuition to formal exam-ready derivations.
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                      Ask follow-up questions with persistent conversation history across five pedagogical modes—Explain Like a Beginner, Detailed Explanation, Short Answer, Exam Preparation, and Step-by-Step—or generate full 7-part structured topic breakdowns.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Beginner Intuition · Step-by-Step Proofs · Worked Examples · Viva FAQs
                  </div>
                </div>
                <div className="w-full md:w-64 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  {!featureImgFailed ? (
                    <img
                      src={featureArchImg}
                      alt="Isometric conceptual knowledge graph showing connected mathematical polyhedra"
                      referrerPolicy="no-referrer"
                      onError={() => setFeatureImgFailed(true)}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 md:h-full flex items-center justify-center bg-slate-900">
                      <Brain className="w-10 h-10 text-teal-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Card 02: Quiz Generator */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    02. Interactive Quiz Engine
                  </p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Timed MCQ Assessments with Automated Grading
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Generate 5, 10, 15, or 20 multiple-choice questions calibrated to Easy, Medium, or Hard difficulty. Navigate question-by-question with a live timer and review detailed answer rationales upon submission.
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
                  Instant Evaluation · Answer Explanations · Saved History
                </p>
              </div>

              {/* Card 03: Study Notes & PDF */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    03. Study Notes & PDF Export
                  </p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Editable Revision Sheets
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Create Short, Detailed, Exam-Oriented, or Bullet-Point revision notes with definitions and examples. Edit your saved library and export clean multi-page PDFs.
                  </p>
                </div>
              </div>

              {/* Card 04: Empirical Analytics */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    04. Student Progress Tracker
                  </p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Database-Driven Performance Analytics
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Monitor real quiz completion counts, average and peak percentages, subject-by-subject mastery charts, and weekly learning consistency calculated directly from your records.
                  </p>
                </div>
              </div>

              {/* Card 05: Faculty & Admin Governance */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    05. Dedicated Admin Governance
                  </p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Curriculum & Cohort Oversight
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Separate administrator console for managing curriculum subjects and topics, inspecting student learning activity, monitoring AI module utilization, and configuring rate limits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="py-20 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1519]"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-2">
                Structured Learning Loop
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                How students turn unfamiliar syllabus topics into exam mastery.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: '01. Select Subject & Level',
                  title: 'Configure Your Academic Context',
                  desc: 'Register with your semester level and preferred CSE or university subjects so explanations match your syllabus depth.',
                },
                {
                  step: '02. Understand Concepts',
                  title: 'Explore Topics & Ask Follow-Ups',
                  desc: 'Use the Topic Explainer for structured definitions and examples, then clarify doubts in the 5-mode AI Study Assistant.',
                },
                {
                  step: '03. Synthesize Study Notes',
                  title: 'Compile & Export PDF Handouts',
                  desc: 'Generate exam-oriented or bullet revision notes, refine them in the built-in editor, and download formatted PDFs for offline study.',
                },
                {
                  step: '04. Evaluate & Track Mastery',
                  title: 'Take Timed Quizzes & Measure Gains',
                  desc: 'Verify retention through timed multiple-choice tests with instant explanations while tracking subject-wise scores over time.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border-t border-slate-300 dark:border-slate-700 pt-5"
                >
                  <p className="font-mono text-xs text-teal-700 dark:text-teal-400 mb-2">
                    {item.step}
                  </p>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS FOR STUDENTS & CONVERSION CTA */}
        <section id="benefits" className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mb-2">
                  Academic Outcomes
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance mb-6">
                  Built specifically for focused university learning—not generic chat threads.
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Eliminate Passive Reading',
                      detail:
                        'Move immediately from reading an explanation on Deadlock Avoidance or BCNF Normalization to answering timed exam-grade MCQs on the exact same concept.',
                    },
                    {
                      title: 'Organized Personal Knowledge Base',
                      detail:
                        'Every generated note and saved topic explanation remains editable in your private student library and exports cleanly to PDF before mid-semester or end-semester exams.',
                    },
                    {
                      title: 'Transparent, Honest Progress Metrics',
                      detail:
                        'Identify weak subjects early with authentic accuracy breakdowns calculated strictly from your completed quiz attempts and study history.',
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                          {b.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {b.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-8">
                  <div className="w-10 h-10 rounded-lg bg-teal-600/15 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Ready to start your study session?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Open either workspace directly with zero password required—explore the AI Study Assistant, Topic Explainer, Quiz Generator, PDF Notes Builder, or Faculty Admin Console.
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={onOpenStudentPortal}
                      className="w-full py-3 px-4 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors cursor-pointer"
                    >
                      Open Student Portal (No Password)
                    </button>
                    <button
                      type="button"
                      onClick={onOpenAdminPortal}
                      className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Open Admin Portal (No Password)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-10 bg-white dark:bg-[#070B0E]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              AI-Powered Student Learning Assistant
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              B.Tech Computer Science & Engineering · 5th Semester Summer Vocational Training Project
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Daylight Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Obsidian Dark Theme</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              VT Project Report
            </button>
            <button
              type="button"
              onClick={onOpenStudentPortal}
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </footer>

      <ProjectReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        institutionName={publicInfo.institutionName}
      />
    </div>
  );
};
