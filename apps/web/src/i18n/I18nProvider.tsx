import { PropsWithChildren, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { useAppSelector } from '../store/hooks';
import { loadMessages } from './loadMessages';
import enMessages from '../messages/en.json';

export function I18nProvider({ children }: PropsWithChildren) {
  const locale = useAppSelector((s) => s.locale.current);
  const [messages, setMessages] = useState<Record<string, string>>(enMessages);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (locale === 'en') {
      setMessages(enMessages);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    loadMessages(locale)
      .then((msg) => {
        if (!cancelled) {
          setMessages(msg);
        }
      })
      .catch((err) => {
        console.error('Failed to load locale', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (loading) {
    return (
      <IntlProvider locale={locale} messages={messages}>
        <div className="min-h-screen flex items-center justify-center text-lg opacity-80">
          {messages['app.loading'] ?? 'Loading…'}
        </div>
      </IntlProvider>
    );
  }

  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}
