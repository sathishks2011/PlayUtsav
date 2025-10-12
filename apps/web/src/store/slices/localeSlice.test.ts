import reducer, { setLocale, localeOptions } from './localeSlice';

describe('localeSlice', () => {
  it('defaults to en', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.current).toBe('en');
    expect(localeOptions.map((l) => l.id)).toContain('en');
  });

  it('sets locale', () => {
    const state = reducer(undefined, setLocale('es'));
    expect(state.current).toBe('es');
  });
});

