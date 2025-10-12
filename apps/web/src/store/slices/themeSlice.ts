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
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
