import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { ReactElement, ReactNode } from 'react';
import sessionReducer from '../store/slices/sessionSlice';
import themeReducer from '../store/slices/themeSlice';
import localeReducer from '../store/slices/localeSlice';
import quizReducer from '../store/slices/quizSlice';
import settingsReducer from '../store/slices/settingsSlice';
import authReducer from '../store/slices/authSlice';
import type { RootState } from '../store/store';

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      session: sessionReducer,
      theme: themeReducer,
      locale: localeReducer,
      quiz: quizReducer,
      settings: settingsReducer,
      auth: authReducer,
    } as any,
    preloadedState: preloadedState as any,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { preloadedState }: { preloadedState?: Partial<RootState> } = {}
) {
  const store = setupStore(preloadedState);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper }),
  };
}
