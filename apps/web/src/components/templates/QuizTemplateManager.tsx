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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const totalQuestions = template.categories.reduce((sum, cat) => sum + cat.questions.length, 0);

            return (
              <article key={template.id} className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-5 shadow-sm">
                <header className="space-y-1">
                  <h3 className="text-lg font-semibold text-[var(--fg)]">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-[var(--fg)]/65 line-clamp-2">{template.description}</p>
                  )}
                </header>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--fg)]/60">
                  <div>
                    <dt className="uppercase tracking-wider">Categories</dt>
                    <dd className="mt-1 text-sm text-[var(--fg)]">{template.categories.length}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider">Questions</dt>
                    <dd className="mt-1 text-sm text-[var(--fg)]">{totalQuestions}</dd>
                  </div>
                </dl>

                <footer className="mt-5 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => handleViewTemplate(template)}
                    className="text-blue-200 transition hover:text-blue-100"
                  >
                    View questions
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-200 transition hover:text-red-100"
                  >
                    Delete
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
