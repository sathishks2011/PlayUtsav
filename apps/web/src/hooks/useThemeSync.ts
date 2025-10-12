import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme, setCustomTheme } from '../store/slices/themeSlice';

const STORAGE_KEY = 'playutsav.theme';

const PRESET_VARIABLES: Record<string, { primary: string; accent: string; background: string }> = {
  default: { primary: '#5b8cff', accent: '#ffb703', background: '#0b1020' },
  vibrant: { primary: '#f97316', accent: '#22d3ee', background: '#0c0a1a' },
  sunset: { primary: '#ef4444', accent: '#facc15', background: '#1a0b18' },
  forest: { primary: '#22c55e', accent: '#86efac', background: '#05140f' },
};

function applyThemeVariables(themeId: string, custom?: { primary: string; accent: string; background: string }) {
  const root = document.documentElement;
  if (custom) {
    root.removeAttribute('data-theme');
    root.style.setProperty('--color-primary', custom.primary);
    root.style.setProperty('--color-accent', custom.accent);
    root.style.setProperty('--bg', custom.background);
    root.style.setProperty('--bg-alt', `radial-gradient(circle at top left, ${custom.primary}33, transparent 55%)`);
  } else {
    if (themeId === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeId);
    }
    const preset = PRESET_VARIABLES[themeId];
    if (preset) {
      root.style.setProperty('--color-primary', preset.primary);
      root.style.setProperty('--color-accent', preset.accent);
      root.style.setProperty('--bg', preset.background);
      root.style.setProperty('--bg-alt', '');
    }
  }
}

export function useThemeSync() {
  const themeState = useAppSelector((s) => s.theme);
  const dispatch = useAppDispatch();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { current: string; custom?: { primary: string; accent: string; background: string } } | string;
      if (typeof parsed === 'string') {
        dispatch(setTheme(parsed));
      } else if (parsed && typeof parsed === 'object') {
        dispatch(setTheme(parsed.current));
        if (parsed.custom) {
          dispatch(setCustomTheme(parsed.custom));
        }
      }
    } catch (err) {
      console.warn('Unable to load theme preference', err);
    }
  }, [dispatch]);

  useEffect(() => {
    applyThemeVariables(themeState.current, themeState.custom);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(themeState));
    } catch (err) {
      console.warn('Unable to persist theme preference', err);
    }
  }, [themeState]);
}
