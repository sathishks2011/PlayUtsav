import { useState, FormEvent } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signupThunk, clearError } from '../store/slices/authSlice';

type HostSignupProps = {
  onSwitchToLogin: () => void;
  onCancel: () => void;
};

export function HostSignup({ onSwitchToLogin, onCancel }: HostSignupProps) {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    if (!email || !password) {
      return;
    }

    try {
      await dispatch(
        signupThunk({
          email,
          password,
          displayName: displayName || undefined,
          organization: organization || undefined,
          contactEmail: contactEmail || undefined,
        })
      ).unwrap();
    } catch (err) {
      // Error handled by reducer
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-2">
          <FormattedMessage id="auth.signup.title" defaultMessage="Create Host Account" />
        </h2>
        <p className="text-sm opacity-75 mb-6">
          <FormattedMessage
            id="auth.signup.subtitle"
            defaultMessage="Start hosting engaging sessions"
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
              <span className="text-red-500 ml-1">*</span>
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
              <span className="text-red-500 ml-1">*</span>
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
            <p className="text-xs opacity-60 mt-1">
              <FormattedMessage
                id="auth.password.hint"
                defaultMessage="Minimum 8 characters"
              />
            </p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              <FormattedMessage id="auth.displayName" defaultMessage="Display Name" />
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              placeholder={intl.formatMessage({
                id: 'auth.displayName.placeholder',
                defaultMessage: 'Your name',
              })}
              className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium mb-1">
              <FormattedMessage id="auth.organization" defaultMessage="Organization" />
            </label>
            <input
              id="organization"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={isLoading}
              placeholder={intl.formatMessage({
                id: 'auth.organization.placeholder',
                defaultMessage: 'Company or organization',
              })}
              className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">
              <FormattedMessage id="auth.contactEmail" defaultMessage="Contact Email" />
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={isLoading}
              placeholder={intl.formatMessage({
                id: 'auth.contactEmail.placeholder',
                defaultMessage: 'support@your-org.com',
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
                <FormattedMessage id="auth.signup.loading" defaultMessage="Creating account..." />
              ) : (
                <FormattedMessage id="auth.signup.button" defaultMessage="Create Account" />
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
          <FormattedMessage id="auth.signup.hasAccount" defaultMessage="Already have an account?" />{' '}
          <button
            onClick={onSwitchToLogin}
            disabled={isLoading}
            className="text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
          >
            <FormattedMessage id="auth.login.link" defaultMessage="Sign in" />
          </button>
        </div>
      </div>
    </div>
  );
}
