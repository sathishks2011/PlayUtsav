import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LocaleOption = {
  id: string;
  label: string;
};

export const localeOptions: LocaleOption[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' }
];

type LocaleState = {
  current: string;
};

const initialState: LocaleState = {
  current: 'en',
};

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<string>) {
      state.current = action.payload;
    },
  },
});

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;
