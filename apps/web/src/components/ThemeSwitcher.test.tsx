import { fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import enMessages from '../messages/en.json';
import { ThemeSwitcher } from './ThemeSwitcher';
import { renderWithProviders } from '../test/test-utils';

describe('ThemeSwitcher', () => {
  it('updates theme on change', () => {
    const { getByLabelText, store } = renderWithProviders(
      <IntlProvider locale="en" messages={enMessages}>
        <ThemeSwitcher />
      </IntlProvider>
    );

    const select = getByLabelText(/Theme/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'vibrant' } });

    expect(store.getState().theme.current).toBe('vibrant');
  });
});

