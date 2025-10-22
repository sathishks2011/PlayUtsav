import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchBioscopeTemplates,
  deleteBioscopeTemplate,
  selectTemplate,
  clearError,
  type BioscopeTemplate,
} from '../../store/slices/bioscopeSlice';
import { useToast } from '../ToastProvider';
import BioscopeTemplateUpload from '../bioscope/BioscopeTemplateUpload';
import BioscopeRoundGrid from '../bioscope/BioscopeRoundGrid';

function TemplatePreview({ template }: { template: BioscopeTemplate }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--fg)]">{template.name}</h3>
        {template.description && (
          <p className="mt-1 text-sm text-[var(--fg)]/70">{template.description}</p>
        )}
      </div>

      <div className="grid gap-3 text-sm text-[var(--fg)]/70 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Rounds</p>
          <p className="text-base font-medium text-[var(--fg)]">{template.rounds.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Timer</p>
          <p className="text-base font-medium text-[var(--fg)]">
            {template.configuration?.timer_seconds ?? 30} seconds
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Manual scoring</p>
          <p className="text-base font-medium text-[var(--fg)]">
            {template.configuration?.allow_manual_scoring ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Sound</p>
          <p className="text-base font-medium text-[var(--fg)]">
            {template.configuration?.timer_sound_enabled ? 'Timer sound on' : 'Timer sound off'}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">First 3 rounds</p>
        <div className="mt-2 space-y-2">
          {template.rounds.slice(0, 3).map((round, idx) => (
            <div key={round.round_id ?? idx} className="rounded border border-[var(--fg)]/10 bg-[var(--card)]/60 px-3 py-2">
              <p className="text-sm font-medium text-[var(--fg)]">
                {idx + 1}. {round.title || 'Untitled round'}
              </p>
              <p className="text-xs text-[var(--fg)]/60">{round.images?.length ?? 0} images</p>
            </div>
          ))}
          {template.rounds.length === 0 && (
            <p className="text-sm text-[var(--fg)]/60">This template has no rounds yet.</p>
          )}
          {template.rounds.length > 3 && (
            <p className="text-xs text-[var(--fg)]/50">+{template.rounds.length - 3} more rounds</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function BioscopeTemplateManager() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const session = useAppSelector((s) => s.session.current);
  const authUser = useAppSelector((s) => s.auth.user);
  const { templates, selectedTemplate, loading, error } = useAppSelector((s) => s.bioscope);
  const [showUpload, setShowUpload] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const hostId = session?.hostId ?? authUser?.id;

  useEffect(() => {
    dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
  }, [dispatch, hostId]);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
  };

  const handleViewTemplate = (template: BioscopeTemplate) => {
    try {
      console.log('[BioscopeTemplateManager] Viewing template:', template);
      dispatch(selectTemplate(template));
      setShowGrid(true);
    } catch (error) {
      console.error('[BioscopeTemplateManager] Error viewing template:', error);
      toast.showToast({
        message: `Failed to view template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        duration: 5000
      });
    }
  };

  const handleCloseGrid = () => {
    setShowGrid(false);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    // Confirm with the user before deleting
    const confirmed = window.confirm(
      `Delete template "${templateName}"? This action cannot be undone.\n\nIf the template is attached to an active game it cannot be deleted.`
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteBioscopeTemplate({ templateId, hostId })).unwrap();
      toast.showToast({
        message: `Template "${templateName}" deleted successfully`,
        type: 'success',
        duration: 3000,
      });
      // Refresh templates list
      dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
    } catch (error: any) {
      // Handle HTTP 409 (Conflict) specifically
      let errorMessage = 'Failed to delete template';
      if (error?.status === 409) {
        errorMessage = 'Template is currently in use by an active game. Please stop the game before deleting.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.showToast({
        message: errorMessage,
        type: 'error',
        duration: 6000,
      });
    }
  };

  const handleDownloadSample = () => {
    const sampleTemplate = {
      name: 'Sample Bioscope Template',
      description: 'A sample template showing the required format for Bioscope games',
      configuration: {
        timer_seconds: 30,
        timer_sound_enabled: true,
        multiple_choice_mode: false,
        allow_manual_scoring: true,
        max_images: 5,
        sound_effects: {
          on_image_reveal: 'reveal.mp3',
          on_final_reveal: 'final.mp3',
          on_correct_answer: 'correct.mp3',
        },
        reveal_animation: 'fade',
        title_reveal_animation: 'slide',
      },
      rounds: [
        {
          round_id: 'round-1',
          title: 'Sample Round 1',
          images: [
            { id: 'img-1', file: '/images/round1-1.jpg', hint: 'First clue', points_multiplier: 1.5 },
            { id: 'img-2', file: '/images/round1-2.jpg', hint: 'Second clue', points_multiplier: 1.2 },
            { id: 'img-3', file: '/images/round1-3.jpg', points_multiplier: 1.0 },
          ],
          answer: {
            title: 'Correct Answer',
            alternatives: ['Alternative 1', 'Alternative 2'],
            reveal_sound: 'answer-reveal.mp3',
            reveal_effect: 'bounce',
          },
          scoring: {
            base_points: 100,
            early_bonus: 50,
            final_image_points: 200,
          },
        },
        {
          round_id: 'round-2',
          title: 'Sample Round 2',
          images: [
            { id: 'img-4', file: '/images/round2-1.jpg', hint: 'Opening clue', points_multiplier: 2.0 },
            { id: 'img-5', file: '/images/round2-2.jpg', points_multiplier: 1.0 },
          ],
          answer: {
            title: 'Another Answer',
            reveal_sound: 'answer-reveal.mp3',
          },
          scoring: {
            base_points: 150,
            early_bonus: 75,
          },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(sampleTemplate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bioscope-template-sample.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  if (showGrid && selectedTemplate) {
    console.log('[BioscopeTemplateManager] Showing grid for template:', selectedTemplate.name);
    return <BioscopeRoundGrid template={selectedTemplate} onClose={handleCloseGrid} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--fg)]">Bioscope Templates</h2>
          <p className="text-sm text-[var(--fg)]/70">
            Browse Bioscope configurations. You can attach any template to an active session and control the show from the Bioscope panel.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
          >
            <span className="text-lg">⬇️</span>
            Download Sample
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          >
            <span className="text-lg">➕</span>
            Upload Template
          </button>
        </div>
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
        <div className="flex justify-center py-10">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-[var(--fg)]/20 bg-[var(--card)]/40 p-12 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="text-4xl">🎬</div>
            <div>
              <p className="text-lg font-medium text-[var(--fg)]/80">No Bioscope templates yet</p>
              <p className="mt-2 text-sm text-[var(--fg)]/60">
                Download the sample template to see the JSON format, then upload your own progressive image reveal games.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-6 py-3 font-semibold text-blue-100 transition hover:bg-blue-500/20"
              >
                <span className="text-lg">⬇️</span>
                Download Sample
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600"
              >
                <span className="text-lg">📤</span>
                Upload Template
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            const totalImages = template.rounds.reduce((sum, round) => sum + (round.images?.length ?? 0), 0);

            return (
              <article
                key={template.id}
                className={`group relative overflow-hidden rounded-xl border shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isSelected
                    ? 'border-purple-400/70 bg-gradient-to-br from-purple-500/20 to-pink-500/10'
                    : 'border-[var(--fg)]/15 bg-gradient-to-br from-[var(--card)]/90 to-[var(--card)]/70 hover:border-purple-400/40'
                }`}
              >
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Selected indicator badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/50 backdrop-blur-sm">
                    <span className="text-xs font-bold text-purple-100">✓ SELECTED</span>
                  </div>
                )}

                <div className="relative p-6 space-y-4">
                  {/* Header without icon */}
                  <header className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-[var(--fg)] flex-1">{template.name}</h3>
                      {template.isPublic && (
                        <span className="flex-shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wide text-emerald-100">
                          Public
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-[var(--fg)]/60 line-clamp-2">{template.description}</p>
                    )}
                  </header>

                  {/* Stats Grid with enhanced styling */}
                  <dl className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-[var(--fg)]/50 font-medium">
                        <span className="text-sm">🎯</span>
                        Rounds
                      </dt>
                      <dd className="mt-1 text-lg font-bold text-[var(--fg)]">{template.rounds.length}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-[var(--fg)]/50 font-medium">
                        <span className="text-sm">🖼️</span>
                        Images
                      </dt>
                      <dd className="mt-1 text-lg font-bold text-[var(--fg)]">{totalImages}</dd>
                    </div>
                    <div className="rounded-lg bg-[var(--fg)]/5 border border-[var(--fg)]/10 px-2.5 py-2">
                      <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-[var(--fg)]/50 font-medium">
                        <span className="text-sm">⏱️</span>
                        Timer
                      </dt>
                      <dd className="mt-1 text-lg font-bold text-[var(--fg)]">{template.configuration?.timer_seconds ?? 30}s</dd>
                    </div>
                  </dl>

                  {/* Action buttons with enhanced styling */}
                  <footer className="flex items-center gap-2 pt-2 border-t border-[var(--fg)]/10">
                    <button
                      type="button"
                      onClick={() => handleViewTemplate(template)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-sm font-medium text-purple-100 transition-all duration-200 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20"
                      title="View rounds and images"
                    >
                      <span className="text-base">👁️</span>
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch(selectTemplate(template))}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 text-green-100 hover:from-green-500/30 hover:to-emerald-500/30'
                          : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-100 hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20'
                      }`}
                      title={isSelected ? 'Currently selected' : 'Select this template'}
                    >
                      <span className="text-base">{isSelected ? '✓' : '☑️'}</span>
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-400/30 text-sm font-medium text-red-200 transition-all duration-200 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-100 hover:shadow-lg hover:shadow-red-500/20"
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

      {selectedTemplate && (
        <div className="rounded-lg border border-purple-400/40 bg-purple-500/10 p-5">
          <TemplatePreview template={selectedTemplate} />
        </div>
      )}
    </div>
  );
}
