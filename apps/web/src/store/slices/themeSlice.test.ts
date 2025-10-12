import reducer, { setTheme, themeOptions } from './themeSlice';

describe('themeSlice', () => {
  it('has default theme', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.current).toBe('default');
    expect(themeOptions.length).toBeGreaterThan(0);
  });

  it('updates theme', () => {
    const state = reducer(undefined, setTheme('vibrant'));
    expect(state.current).toBe('vibrant');
  });
});

