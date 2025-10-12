import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { themeOptions, setTheme, setCustomTheme, resetTheme } from '../store/slices/themeSlice';

const presetConfig: Record<string, { primary: string; accent: string; background: string }> = {
  default: { primary: '#5b8cff', accent: '#ffb703', background: '#0b1020' },
  vibrant: { primary: '#f97316', accent: '#22d3ee', background: '#0c0a1a' },
  sunset: { primary: '#ef4444', accent: '#facc15', background: '#1a0b18' },
  forest: { primary: '#22c55e', accent: '#86efac', background: '#05140f' },
};

export function ThemeStudioPanel() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.theme);

  const activePreset = theme.current;
  const custom = theme.custom;

  const palette = useMemo(() => {
    if (custom) return custom;
    return presetConfig[activePreset] ?? presetConfig.default;
  }, [activePreset, custom]);

  const handlePresetChange = (preset: string) => {
    dispatch(setTheme(preset));
  };

  const handleColorChange = (key: 'primary' | 'accent' | 'background', value: string) => {
    dispatch(setCustomTheme({ ...palette, [key]: value }));
  };

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Theme Studio</h3>
        <button
          type="button"
          className="px-3 py-1 text-xs uppercase tracking-[0.2em] border border-white/10 rounded"
          onClick={() => dispatch(resetTheme())}
        >
          Reset
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <label className="flex flex-col text-sm gap-1">
            <span>Preset</span>
            <select
              value={activePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded border border-white/10 bg-black/30 px-3 py-2"
            >
              {themeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span>Primary color</span>
            <input
              type="color"
              value={palette.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="h-10 rounded border border-white/10"
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span>Accent color</span>
            <input
              type="color"
              value={palette.accent}
              onChange={(e) => handleColorChange('accent', e.target.value)}
              className="h-10 rounded border border-white/10"
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            <span>Background base</span>
            <input
              type="color"
              value={palette.background}
              onChange={(e) => handleColorChange('background', e.target.value)}
              className="h-10 rounded border border-white/10"
            />
          </label>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-sm opacity-80">Preview</p>
            <div className="mt-3 rounded-lg px-4 py-3" style={{ background: palette.primary }}>
              <span className="text-white text-sm font-medium">Primary button</span>
            </div>
            <div className="mt-3 rounded-lg px-4 py-3" style={{ background: palette.accent, color: '#0f172a' }}>
              <span className="text-sm font-medium">Accent button</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs opacity-70">
            <div>Current preset: {activePreset}</div>
            {custom && <div>Custom colors active</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

