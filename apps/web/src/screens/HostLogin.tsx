import { useState, FormEvent } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginThunk, clearError } from '../store/slices/authSlice';

type HostLoginProps = {
  onSwitchToSignup: () => void;
  onCancel: () => void;
};

export function HostLogin({ onSwitchToSignup, onCancel }: HostLoginProps) {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    
    if (!email || !password) {
      return;
    }

    try {
      await dispatch(loginThunk({ email, password })).unwrap();
    } catch (err) {
      // Error handled by reducer
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-2">
          <FormattedMessage id="auth.login.title" defaultMessage="Host Login" />
        </h2>
        <p className="text-sm opacity-75 mb-6">
          <FormattedMessage 
            id="auth.login.subtitle" 
            defaultMessage="Sign in to manage your sessions" 
          />
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              <FormattedMessage id="auth.email" defaultMessage="Email" />
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder={intl.formatMessage({
                id: 'auth.email.placeholder',
                defaultMessage: 'your@email.com',
              })}
              className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              <FormattedMessage id="auth.password" defaultMessage="Password" />
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              placeholder={intl.formatMessage({
                id: 'auth.password.placeholder',
                defaultMessage: '••••••••',
              })}
              className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-2 bg-[var(--accent)] text-white rounded font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isLoading ? (
                <FormattedMessage id="auth.login.loading" defaultMessage="Signing in..." />
              ) : (
                <FormattedMessage id="auth.login.button" defaultMessage="Sign In" />
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 border border-[var(--fg)]/20 rounded font-medium hover:bg-[var(--fg)]/5 transition disabled:opacity-50"
            >
              <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <FormattedMessage id="auth.login.noAccount" defaultMessage="Don't have an account?" />{' '}
          <button
            onClick={onSwitchToSignup}
            disabled={isLoading}
            className="text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
          >
            <FormattedMessage id="auth.signup.link" defaultMessage="Sign up" />
          </button>
        </div>
      </div>
    </div>
  );
}
