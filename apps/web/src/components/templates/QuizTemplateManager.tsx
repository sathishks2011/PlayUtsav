import { useEffect, useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import type { QuizTemplateResponse } from '@pkg/core';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTemplates,
  deleteTemplate,
  selectTemplate,
  clearError,
} from '../../store/slices/quizTemplateSlice';
import TemplateUpload from '../TemplateUpload';
import QuestionGrid from '../QuestionGrid';

export function QuizTemplateManager() {
  const dispatch = useAppDispatch();
  const { templates, loading, error, selectedTemplate } = useAppSelector((state) => state.quizTemplate);
  const [showUpload, setShowUpload] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const toast = useToast();

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;

    const timer = window.setTimeout(() => {
      dispatch(clearError());
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [error, dispatch]);

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/quiz-template-sample.json';
    link.download = 'quiz-template-sample.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewTemplate = (template: QuizTemplateResponse) => {
    dispatch(selectTemplate(template));
    setShowGrid(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    // Non-blocking delete: proceed immediately and show toast feedback.
    try {
      await dispatch(deleteTemplate(templateId)).unwrap();
      // show toast
      try { toast.showToast({ message: 'Template deleted', type: 'success', duration: 3500 }); } catch {}
    } catch (err) {
      try { toast.showToast({ message: 'Failed to delete template', type: 'error', duration: 6000 }); } catch {}
    }
  };

  const handleCloseGrid = () => {
    setShowGrid(false);
  };

  if (showUpload) {
    return (
      <TemplateUpload
        onClose={() => setShowUpload(false)}
        onSuccess={() => {
          setShowUpload(false);
          dispatch(fetchTemplates());
        }}
      />
    );
  }

  if (showGrid && selectedTemplate) {
    return <QuestionGrid template={selectedTemplate} onClose={handleCloseGrid} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[var(--fg)]">Quiz Templates</h2>
        <p className="text-sm text-[var(--fg)]/70">
          Manage your reusable quiz question sets. Download the sample format, fill in questions, then upload to make them available to any session.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Unable to load templates</p>
              <p className="mt-1 text-red-100/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(clearError())}
              className="rounded border border-red-400/50 px-2 py-1 text-xs uppercase tracking-wide hover:bg-red-400/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
        >
          <span className="text-lg">⬇️</span>
          Download Sample JSON
        </button>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <span className="text-lg">📤</span>
          Upload Template
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-[var(--fg)]/20 bg-[var(--card)]/40 p-8 text-center">
          <p className="text-lg font-medium text-[var(--fg)]/80">No quiz templates yet</p>
          <p className="mt-2 text-sm text-[var(--fg)]/60">
            Download the sample file, add your questions, then upload to reuse across shows.
          </p>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
          >
            <span className="text-lg">➕</span>
            Upload your first template
          </button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const totalQuestions = template.categories.reduce((sum, cat) => sum + cat.questions.length, 0);

            return (
              <article
                key={template.id}
                className="group relative overflow-hidden rounded-xl border border-[var(--fg)]/15 bg-gradient-to-br from-[var(--card)]/90 to-[var(--card)]/70 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-blue-400/40 hover:-translate-y-1"
              >
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-6 space-y-4">
                  {/* Header without icon */}
                  <header className="space-y-2">
                    <h3 className="text-xl font-bold text-[var(--fg)]">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-[var(--fg)]/60 line-clamp-2">{template.description}</p>
                    )}
                  </header>

                  {/* Stats Grid with enhanced styling */}
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-3 py-2.5">
                      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--fg)]/50 font-medium">
                        <span className="text-sm">📂</span>
                        Categories
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-[var(--fg)]">{template.categories.length}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-3 py-2.5">
                      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--fg)]/50 font-medium">
                        <span className="text-sm">❓</span>
                        Questions
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-[var(--fg)]">{totalQuestions}</dd>
                    </div>
                  </dl>

                  {/* Action buttons with enhanced styling */}
                  <footer className="flex items-center gap-2 pt-2 border-t border-[var(--fg)]/10">
                    <button
                      type="button"
                      onClick={() => handleViewTemplate(template)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/30 text-sm font-medium text-blue-100 transition-all duration-200 hover:from-blue-500/30 hover:to-blue-600/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
                      title="View and edit questions"
                    >
                      <span className="text-base">👁️</span>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-400/30 text-sm font-medium text-red-200 transition-all duration-200 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-100 hover:shadow-lg hover:shadow-red-500/20"
                      title="Delete this template"
                    >
                      <span className="text-base">🗑️</span>
                      Delete
                    </button>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
