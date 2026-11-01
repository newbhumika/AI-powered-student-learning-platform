import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, FileText, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { apiRequest } from '../lib/api.ts';
import { downloadStudyNotesPdf } from '../lib/pdfExport.ts';

interface ProjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionName: string;
}

export const ProjectReportModal: React.FC<ProjectReportModalProps> = ({
  isOpen,
  onClose,
  institutionName,
}) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || markdown) return;
    setLoading(true);
    setError(null);
    apiRequest<{ title: string; markdown: string }>('/api/public/project-report')
      .then((res) => setMarkdown(res.markdown))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load VT project report.'
        )
      )
      .finally(() => setLoading(false));
  }, [isOpen, markdown]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard access failure
    }
  };

  const handleDownloadPdf = () => {
    if (!markdown) return;
    downloadStudyNotesPdf({
      title: 'B.Tech CSE 5th Sem — Summer VT Project Report',
      subject: 'AI-Powered Student Learning Assistant',
      noteType: 'Academic Project Report',
      markdownContent: markdown,
      institutionName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FA] dark:bg-[#0D1519]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-600/15 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                B.Tech CSE 5th Sem · Vocational Training Project Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Complete 18-Chapter Academic Documentation & Architecture Specification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!markdown}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!markdown}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close project report"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700 dark:text-teal-400" />
              <span>Loading VT Project Report...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : (
            <div className="markdown-body text-sm text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl mx-auto">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
