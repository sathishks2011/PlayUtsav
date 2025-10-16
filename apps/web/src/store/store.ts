import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import themeReducer from './slices/themeSlice';
import localeReducer from './slices/localeSlice';
import quizReducer from './slices/quizSlice';
import settingsReducer from './slices/settingsSlice';
import authReducer from './slices/authSlice';
import quizTemplateReducer from './slices/quizTemplateSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    theme: themeReducer,
    locale: localeReducer,
    quiz: quizReducer,
    auth: authReducer,
    settings: settingsReducer,
    quizTemplate: quizTemplateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
