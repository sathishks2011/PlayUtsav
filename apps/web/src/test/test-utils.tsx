import { render } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { ReactElement, ReactNode } from 'react';
import sessionReducer from '../store/slices/sessionSlice';
import themeReducer from '../store/slices/themeSlice';
import localeReducer from '../store/slices/localeSlice';
import type { RootState } from '../store/store';

export function setupStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: {
      session: sessionReducer,
      theme: themeReducer,
      locale: localeReducer,
    },
    preloadedState,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { preloadedState }: { preloadedState?: PreloadedState<RootState> } = {}
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
