import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/slices/themeSlice';

const STORAGE_KEY = 'familyfun.theme';

export function useThemeSync() {
  const theme = useAppSelector((s) => s.theme.current);
  const dispatch = useAppDispatch();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        dispatch(setTheme(stored));
      }
    } catch (err) {
      console.warn('Unable to load theme preference', err);
    }
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      console.warn('Unable to persist theme preference', err);
    }
  }, [theme]);
}

