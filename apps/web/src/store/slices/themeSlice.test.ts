import reducer, { setTheme, setCustomTheme, resetTheme, themeOptions } from './themeSlice';

describe('themeSlice', () => {
  it('has default theme', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.current).toBe('default');
    expect(themeOptions.length).toBeGreaterThan(0);
  });

  it('updates theme', () => {
    const state = reducer(undefined, setTheme('vibrant'));
    expect(state.current).toBe('vibrant');
    expect(state.custom).toBeUndefined();
  });

  it('applies custom palette', () => {
    const state = reducer(undefined, setCustomTheme({ primary: '#fff', accent: '#000', background: '#123456' }));
    expect(state.custom?.primary).toBe('#fff');
  });

  it('resets theme', () => {
    const base = reducer(undefined, setCustomTheme({ primary: '#fff', accent: '#000', background: '#123456' }));
    const reset = reducer(base, resetTheme());
    expect(reset.current).toBe('default');
    expect(reset.custom).toBeUndefined();
  });
});
