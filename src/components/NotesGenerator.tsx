import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { downloadStudyNotesPdf } from '../lib/pdfExport.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type {
  NoteType,
  SavedNote,
  StructuredNoteContent,
  TopicExplanationContent,
} from '../shared/types.ts';

const NOTE_TYPES: {
  id: Exclude<NoteType, 'topic_explanation'>;
  label: string;
}[] = [
  { id: 'short', label: 'Short Notes' },
  { id: 'detailed', label: 'Detailed Notes' },
  { id: 'exam', label: 'Exam-Oriented Notes' },
  { id: 'bullet', label: 'Bullet-Point Revision' },
];

export const NotesGenerator: React.FC = () => {
  const { user, publicInfo } = useAuth();

  // Generator inputs
  const [subject, setSubject] = useState(
    publicInfo.subjects[0]?.name || 'Database Management Systems'
  );
  const [topic, setTopic] = useState('');
  const [noteType, setNoteType] =
    useState<Exclude<NoteType, 'topic_explanation'>>('exam');

  // Active note view / editor
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [activeNote, setActiveNote] = useState<{
    id?: string;
    title: string;
    subject: string;
    topic: string;
    noteType: NoteType;
    structuredContent?: StructuredNoteContent | TopicExplanationContent;
    markdownContent: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMarkdown, setEditMarkdown] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = () => {
    apiRequest<{ notes: SavedNote[] }>('/api/notes')
      .then((res) => {
        setSavedNotes(res.notes);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    setError(null);
    setIsEditing(false);
    try {
      const res = await apiRequest<{
        structured: StructuredNoteContent;
        markdown: string;
      }>('/api/ai/generate-notes', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic,
          noteType,
        }),
      });

      setActiveNote({
        title: res.structured.heading || topic,
        subject,
        topic,
        noteType,
        structuredContent: res.structured,
        markdownContent: res.markdown,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate study notes.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveNewNote = async () => {
    if (!activeNote || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest<{ note: SavedNote }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(activeNote),
      });
      setActiveNote(res.note);
      setSavedNotes((prev) => [res.note, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (!activeNote) return;
    setEditTitle(activeNote.title);
    setEditMarkdown(activeNote.markdownContent);
    setIsEditing(true);
  };

  const handleSaveEditedNote = async () => {
    if (!activeNote) return;
    setSaving(true);
    setError(null);
    try {
      if (activeNote.id) {
        const res = await apiRequest<{ note: SavedNote }>(
          `/api/notes/${activeNote.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: editTitle,
              subject: activeNote.subject,
              markdownContent: editMarkdown,
            }),
          }
        );
        setActiveNote(res.note);
        setSavedNotes((prev) =>
          prev.map((n) => (n.id === res.note.id ? res.note : n))
        );
      } else {
        const res = await apiRequest<{ note: SavedNote }>('/api/notes', {
          method: 'POST',
          body: JSON.stringify({
            ...activeNote,
            title: editTitle,
            markdownContent: editMarkdown,
          }),
        });
        setActiveNote(res.note);
        setSavedNotes((prev) => [res.note, ...prev]);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edits.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiRequest(`/api/notes/${id}`, { method: 'DELETE' });
      setSavedNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNote?.id === id) {
        setActiveNote(null);
      }
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note.');
    }
  };

  const handleCopy = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard restriction
    }
  };

  return (
    <div className="space-y-6">
      {/* Notes Generator Form */}
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            AI Study Notes & Handout Builder
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate structured academic notes, edit and save them to your private library, or export formatted PDFs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subject
            </label>
            <input
              type="text"
              list="notes-subjects"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <datalist id="notes-subjects">
              {publicInfo.subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-8">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Topic Heading
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., ACID Properties and Two-Phase Locking in DBMS"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0A1013] border border-slate-200 dark:border-slate-800">
            {NOTE_TYPES.map((nt) => (
              <button
                key={nt.id}
                type="button"
                onClick={() => setNoteType(nt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  noteType === nt.id
                    ? 'bg-teal-700 dark:bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {nt.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={generating || !topic.trim()}
            className="px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling Study Notes...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Generate Notes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Workspace Split: Saved Library + Active Note Viewer/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved Notes Sidebar */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-5 flex flex-col max-h-[650px]">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-1">
            Saved Notes Library ({savedNotes.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Private notes and saved topic explanations
          </p>

          <div className="flex-1 overflow-y-auto space-y-2">
            {savedNotes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                No saved notes yet. Generate study notes above and click Save Note.
              </p>
            ) : (
              savedNotes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setActiveNote({
                        id: n.id,
                        title: n.title,
                        subject: n.subject,
                        topic: n.topic,
                        noteType: n.noteType,
                        structuredContent: n.structuredContent,
                        markdownContent: n.markdownContent,
                      });
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {n.title}
                      </p>
                      {confirmDeleteId === n.id ? (
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Delete saved note"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(n.id);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                      {n.subject} · {n.noteType.replace('_', ' ')} ·{' '}
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Note Viewer / Editor */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10191E] p-6 sm:p-8 min-h-[420px]">
          {generating ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-7 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-48 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : !activeNote ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <FileText className="w-10 h-10 text-slate-400 mb-3" />
              <p className="font-display text-base font-semibold text-slate-800 dark:text-slate-200">
                No study note selected
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Enter any syllabus topic above to generate structured revision notes, or click a saved note from your library on the left.
              </p>
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Edit Study Note
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedNote}
                    disabled={saving}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Markdown Content
                </label>
                <textarea
                  rows={16}
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeNote.subject} · {activeNote.noteType.replace('_', ' ')}
                    {activeNote.id ? ' · Saved in Library' : ' · Unsaved Draft'}
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {activeNote.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!activeNote.id && (
                    <button
                      type="button"
                      onClick={handleSaveNewNote}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-teal-600/50 bg-teal-600/10 text-teal-800 dark:text-teal-300 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-teal-600/20 transition-colors cursor-pointer"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Save Note'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadStudyNotesPdf({
                        title: activeNote.title,
                        subject: activeNote.subject,
                        noteType: activeNote.noteType,
                        markdownContent: activeNote.markdownContent,
                        studentName: user?.fullName,
                        institutionName: publicInfo.institutionName,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Rendered Markdown Handout */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-3 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-display [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                <ReactMarkdown>{activeNote.markdownContent}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
