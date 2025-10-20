import { useState, useRef, ChangeEvent } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { createBioscopeTemplate, type BioscopeTemplate } from '../../store/slices/bioscopeSlice';

interface BioscopeTemplateUploadProps {
  hostId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BioscopeTemplateUpload({
  hostId,
  onClose,
  onSuccess,
}: BioscopeTemplateUploadProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Omit<BioscopeTemplate, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Basic validation
      if (!data.name || !data.rounds || !Array.isArray(data.rounds)) {
        throw new Error('Invalid template format: missing required fields (name, rounds)');
      }

      // Validate rounds structure
      for (const round of data.rounds) {
        if (!round.round_id || !round.title || !round.images || !Array.isArray(round.images)) {
          throw new Error(`Invalid round structure: ${round.title || 'unnamed round'}`);
        }
        if (!round.answer || !round.answer.title) {
          throw new Error(`Round "${round.title}" is missing answer`);
        }
      }

      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;

    setUploading(true);
    setError(null);

    try {
      await dispatch(createBioscopeTemplate({ template: preview, hostId })).unwrap();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload template');
    } finally {
      setUploading(false);
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

  const totalImages = preview?.rounds.reduce((sum, round) => sum + (round.images?.length || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--fg)]">Upload Bioscope Template</h3>
          <p className="mt-1 text-sm text-[var(--fg)]/60">
            Upload a JSON file with your Bioscope game configuration
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--fg)]/70 transition hover:bg-[var(--fg)]/5"
        >
          ✕ Close
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-medium">Upload Error</p>
              <p className="mt-1 text-red-100/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded border border-red-400/50 px-2 py-1 text-xs uppercase tracking-wide hover:bg-red-400/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={handleDownloadSample}
          className="flex items-center gap-3 rounded-lg border border-blue-400/40 bg-blue-500/10 p-4 text-left transition hover:bg-blue-500/20"
        >
          <span className="text-3xl">📥</span>
          <div>
            <p className="font-medium text-blue-100">Download Sample Template</p>
            <p className="mt-1 text-xs text-blue-200/70">Get the JSON format reference</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-left transition hover:bg-emerald-500/20"
        >
          <span className="text-3xl">📤</span>
          <div>
            <p className="font-medium text-emerald-100">Select JSON File</p>
            <p className="mt-1 text-xs text-emerald-200/70">Choose your template file</p>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload Bioscope template JSON file"
        />
      </div>

      {preview && (
        <div className="rounded-lg border border-purple-400/40 bg-purple-500/10 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-purple-100">{preview.name}</h4>
                {preview.description && (
                  <p className="mt-1 text-sm text-purple-200/70">{preview.description}</p>
                )}
              </div>
              <span className="rounded-full bg-purple-400/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-purple-100">
                Ready to Upload
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded border border-purple-400/30 bg-purple-600/10 p-3">
                <p className="text-xs uppercase tracking-wider text-purple-200/60">Rounds</p>
                <p className="mt-1 text-xl font-bold text-purple-100">{preview.rounds.length}</p>
              </div>
              <div className="rounded border border-purple-400/30 bg-purple-600/10 p-3">
                <p className="text-xs uppercase tracking-wider text-purple-200/60">Total Images</p>
                <p className="mt-1 text-xl font-bold text-purple-100">{totalImages}</p>
              </div>
              <div className="rounded border border-purple-400/30 bg-purple-600/10 p-3">
                <p className="text-xs uppercase tracking-wider text-purple-200/60">Timer</p>
                <p className="mt-1 text-xl font-bold text-purple-100">
                  {preview.configuration?.timer_seconds || 30}s
                </p>
              </div>
              <div className="rounded border border-purple-400/30 bg-purple-600/10 p-3">
                <p className="text-xs uppercase tracking-wider text-purple-200/60">Max Images</p>
                <p className="mt-1 text-xl font-bold text-purple-100">
                  {preview.configuration?.max_images || 5}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium uppercase tracking-wider text-purple-200/70">
                Sample Rounds
              </h5>
              <div className="space-y-2">
                {preview.rounds.slice(0, 3).map((round, idx) => (
                  <div
                    key={round.round_id}
                    className="rounded border border-purple-400/20 bg-purple-600/5 p-3"
                  >
                    <p className="font-medium text-purple-100">
                      {idx + 1}. {round.title}
                    </p>
                    <div className="mt-1 flex gap-4 text-xs text-purple-200/60">
                      <span>{round.images?.length || 0} images</span>
                      <span>Answer: {round.answer?.title}</span>
                    </div>
                  </div>
                ))}
                {preview.rounds.length > 3 && (
                  <p className="text-xs text-purple-200/50">
                    +{preview.rounds.length - 3} more rounds...
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Template'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] px-6 py-3 font-semibold text-[var(--fg)] transition hover:bg-[var(--fg)]/5"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {!preview && (
        <div className="rounded-lg border-2 border-dashed border-[var(--fg)]/20 bg-[var(--card)]/40 p-12 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="text-4xl">📋</div>
            <div>
              <p className="text-lg font-medium text-[var(--fg)]/80">No file selected</p>
              <p className="mt-2 text-sm text-[var(--fg)]/60">
                Download the sample template to see the required JSON format, then upload your own template file.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--fg)]/5 p-4 text-sm text-[var(--fg)]/70">
        <p className="font-medium text-[var(--fg)]">Template Requirements:</p>
        <ul className="mt-2 space-y-1 pl-5">
          <li className="list-disc">Must be valid JSON format</li>
          <li className="list-disc">Required: name, rounds array</li>
          <li className="list-disc">Each round needs: round_id, title, images array, answer object</li>
          <li className="list-disc">Each image needs: id, file path</li>
          <li className="list-disc">Answer must have: title</li>
        </ul>
      </div>
    </div>
  );
}
