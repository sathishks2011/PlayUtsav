import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeOption = {
  id: string;
  label: string;
};

export const themeOptions: ThemeOption[] = [
  { id: 'default', label: 'Aurora' },
  { id: 'vibrant', label: 'Vibrant Pop' },
  { id: 'sunset', label: 'Sunset Glow' },
  { id: 'forest', label: 'Forest Trail' },
];

type ThemeState = {
  current: string;
  custom?: {
    primary: string;
    accent: string;
    background: string;
  };
};

const initialState: ThemeState = {
  current: 'default',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<string>) {
      state.current = action.payload;
      state.custom = undefined;
    },
    setCustomTheme(state, action: PayloadAction<{ primary: string; accent: string; background: string }>) {
      state.custom = action.payload;
    },
    resetTheme() {
      return { ...initialState };
    },
  },
});

export const { setTheme, setCustomTheme, resetTheme } = themeSlice.actions;
export default themeSlice.reducer;
