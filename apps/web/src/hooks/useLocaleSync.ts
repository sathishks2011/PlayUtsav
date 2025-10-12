import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLocale } from '../store/slices/localeSlice';

const STORAGE_KEY = 'familyfun.locale';

export function useLocaleSync() {
  const locale = useAppSelector((s) => s.locale.current);
  const dispatch = useAppDispatch();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        dispatch(setLocale(stored));
      }
    } catch (err) {
      console.warn('Unable to load locale preference', err);
    }
  }, [dispatch]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (err) {
      console.warn('Unable to persist locale preference', err);
    }
  }, [locale]);
}

