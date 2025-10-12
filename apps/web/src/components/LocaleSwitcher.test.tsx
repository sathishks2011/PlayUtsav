import { fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import enMessages from '../messages/en.json';
import { LocaleSwitcher } from './LocaleSwitcher';
import { renderWithProviders } from '../test/test-utils';

describe('LocaleSwitcher', () => {
  it('updates locale on change', () => {
    const { getByLabelText, store } = renderWithProviders(
      <IntlProvider locale="en" messages={enMessages}>
        <LocaleSwitcher />
      </IntlProvider>
    );

    const select = getByLabelText(/Language/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'es' } });

    expect(store.getState().locale.current).toBe('es');
  });
});

