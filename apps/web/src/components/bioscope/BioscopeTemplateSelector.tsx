import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchBioscopeTemplates,
  selectTemplate,
  startBioscopeGame,
  clearError,
  type BioscopeTemplate,
} from '../../store/slices/bioscopeSlice';
import BioscopeTemplateUpload from './BioscopeTemplateUpload';

interface BioscopeTemplateSelectorProps {
  sessionId: string;
  hostId?: string;
  onTemplateAttached?: () => void;
}

export default function BioscopeTemplateSelector({
  sessionId,
  hostId,
  onTemplateAttached,
}: BioscopeTemplateSelectorProps) {
  const dispatch = useAppDispatch();
  const { templates, selectedTemplate, loading, error } = useAppSelector((state) => state.bioscope);
  const [showUpload, setShowUpload] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
  }, [dispatch, hostId]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSelectTemplate = (template: BioscopeTemplate) => {
    dispatch(selectTemplate(template));
    setShowPreview(true);
  };

  const handleAttachTemplate = async () => {
    if (!selectedTemplate) return;

    setAttaching(true);
    try {
      await dispatch(startBioscopeGame({ sessionId, templateId: selectedTemplate.id })).unwrap();
      onTemplateAttached?.();
      setShowPreview(false);
    } catch (err) {
      console.error('Failed to attach template:', err);
    } finally {
      setAttaching(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
  };

  if (showUpload) {
    return (
      <BioscopeTemplateUpload
        hostId={hostId}
        onClose={() => setShowUpload(false)}
        onSuccess={handleUploadSuccess}
      />
    );
  }

  if (showPreview && selectedTemplate) {
    const totalImages = selectedTemplate.rounds.reduce((sum, round) => sum + (round.images?.length || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[var(--fg)]">Template Preview</h3>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--fg)]/70 transition hover:bg-[var(--fg)]/5"
          >
            ← Back to List
          </button>
        </div>

        <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-2xl font-bold text-[var(--fg)]">{selectedTemplate.name}</h4>
              {selectedTemplate.description && (
                <p className="mt-2 text-[var(--fg)]/70">{selectedTemplate.description}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--fg)]/5 p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Rounds</p>
                <p className="mt-1 text-2xl font-bold text-[var(--fg)]">{selectedTemplate.rounds.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--fg)]/5 p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Total Images</p>
                <p className="mt-1 text-2xl font-bold text-[var(--fg)]">{totalImages}</p>
              </div>
              <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--fg)]/5 p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Timer</p>
                <p className="mt-1 text-2xl font-bold text-[var(--fg)]">
                  {selectedTemplate.configuration?.timer_seconds || 30}s
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium uppercase tracking-wider text-[var(--fg)]/60">Configuration</h5>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className={selectedTemplate.configuration?.timer_sound_enabled ? 'text-green-400' : 'text-[var(--fg)]/40'}>
                    {selectedTemplate.configuration?.timer_sound_enabled ? '✓' : '✗'}
                  </span>
                  <span className="text-[var(--fg)]/70">Timer Sound</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={selectedTemplate.configuration?.allow_manual_scoring ? 'text-green-400' : 'text-[var(--fg)]/40'}>
                    {selectedTemplate.configuration?.allow_manual_scoring ? '✓' : '✗'}
                  </span>
                  <span className="text-[var(--fg)]/70">Manual Scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={selectedTemplate.configuration?.multiple_choice_mode ? 'text-green-400' : 'text-[var(--fg)]/40'}>
                    {selectedTemplate.configuration?.multiple_choice_mode ? '✓' : '✗'}
                  </span>
                  <span className="text-[var(--fg)]/70">Multiple Choice Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--fg)]">
                    {selectedTemplate.configuration?.max_images || 5}
                  </span>
                  <span className="text-[var(--fg)]/70">Max Images per Round</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium uppercase tracking-wider text-[var(--fg)]/60">Sample Rounds</h5>
              <div className="space-y-2">
                {selectedTemplate.rounds.slice(0, 3).map((round, idx) => (
                  <div
                    key={round.round_id}
                    className="rounded border border-[var(--fg)]/10 bg-[var(--card)] p-3"
                  >
                    <p className="font-medium text-[var(--fg)]">
                      {idx + 1}. {round.title || 'Untitled Round'}
                    </p>
                    <div className="mt-1 flex gap-4 text-xs text-[var(--fg)]/60">
                      <span>{round.images?.length || 0} images</span>
                      <span>Answer: {round.answer?.title || 'Not set'}</span>
                    </div>
                  </div>
                ))}
                {selectedTemplate.rounds.length > 3 && (
                  <p className="text-xs text-[var(--fg)]/50">
                    +{selectedTemplate.rounds.length - 3} more rounds...
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleAttachTemplate}
              disabled={attaching}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {attaching ? 'Attaching...' : 'Attach to Session'}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] px-6 py-3 font-semibold text-[var(--fg)] transition hover:bg-[var(--fg)]/5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--fg)]">Select Bioscope Template</h3>
          <p className="mt-1 text-sm text-[var(--fg)]/60">
            Choose a template to start your Bioscope game
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
        >
          <span className="text-lg">➕</span>
          Upload New Template
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-center justify-between gap-3">
            <p>{error}</p>
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

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-[var(--fg)]/20 bg-[var(--card)]/40 p-12 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="text-4xl">🎬</div>
            <div>
              <p className="text-lg font-medium text-[var(--fg)]/80">No templates available</p>
              <p className="mt-2 text-sm text-[var(--fg)]/60">
                Upload your first Bioscope template to get started with progressive image reveal games.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600"
            >
              <span className="text-lg">📤</span>
              Upload First Template
            </button>
          </div>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const totalImages = template.rounds.reduce((sum, round) => sum + (round.images?.length || 0), 0);

            return (
              <article
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="cursor-pointer rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-5 shadow-sm transition hover:border-purple-400/60 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-lg font-semibold text-[var(--fg)]">{template.name}</h4>
                  {template.isPublic && (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wide text-emerald-100">
                      Public
                    </span>
                  )}
                </div>

                {template.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--fg)]/65">{template.description}</p>
                )}

                <dl className="mt-4 grid grid-cols-3 gap-3 text-xs text-[var(--fg)]/60">
                  <div>
                    <dt className="uppercase tracking-wider">Rounds</dt>
                    <dd className="mt-1 text-sm font-medium text-[var(--fg)]">{template.rounds.length}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider">Images</dt>
                    <dd className="mt-1 text-sm font-medium text-[var(--fg)]">{totalImages}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wider">Timer</dt>
                    <dd className="mt-1 text-sm font-medium text-[var(--fg)]">
                      {template.configuration?.timer_seconds || 30}s
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-[var(--fg)]/50">Click to preview</span>
                  <span className="text-purple-300">→</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
