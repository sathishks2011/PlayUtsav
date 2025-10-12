import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import themeReducer from './slices/themeSlice';
import localeReducer from './slices/localeSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    theme: themeReducer,
    locale: localeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
