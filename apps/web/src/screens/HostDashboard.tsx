import { useEffect, useState, FormEvent } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutThunk } from '../store/slices/authSlice';
import { createSessionThunk, setHostSession } from '../store/slices/sessionSlice';
import { listSessions } from '../lib/api';
import type { Session, PlayerEngagementType } from '@pkg/core';

export function HostDashboard() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const sessionState = useAppSelector((s) => s.session);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [hostName, setHostName] = useState(user?.displayName || '');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [language, setLanguage] = useState('en');
  const [playerEngagementType, setPlayerEngagementType] = useState<PlayerEngagementType>('CHOICE_ANSWER');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const session = await dispatch(
        createSessionThunk({
          hostName: hostName || undefined,
          maxPlayers,
          language,
          playerEngagementType,
        })
      ).unwrap();
      // Session is now in Redux state with role: 'HOST', will show HostLobby
      console.log('Session created:', session.code);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const isCreating = sessionState.status === 'loading';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-1">
              <FormattedMessage id="host.dashboard.title" defaultMessage="Host Dashboard" />
            </h2>
            <p className="text-sm opacity-75">
              <FormattedMessage
                id="host.dashboard.welcome"
                defaultMessage="Welcome back, {name}"
                values={{ name: user?.displayName || user?.email }}
              />
            </p>
          </div>
          <button
            aria-label={intl.formatMessage({ id: 'auth.logout', defaultMessage: 'Sign Out' })}
            onClick={handleLogout}
            className="px-4 py-2 text-sm border border-[var(--fg)]/20 rounded hover:bg-[var(--fg)]/5 transition"
          >
            <FormattedMessage id="auth.logout" defaultMessage="Sign Out" />
          </button>
        </div>
      </div>

      {/* Create Session Form */}
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">
          <FormattedMessage id="host.dashboard.createSession" defaultMessage="Create New Session" />
        </h3>

        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="hostName" className="block text-sm font-medium mb-1">
                <FormattedMessage id="host.hostName" defaultMessage="Host Name" />
              </label>
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                disabled={isCreating}
                aria-label={intl.formatMessage({ id: 'host.hostName', defaultMessage: 'Host Name' })}
                placeholder={intl.formatMessage({
                  id: 'host.hostName.placeholder',
                  defaultMessage: 'Your name',
                })}
                className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium mb-1">
                <FormattedMessage id="host.maxPlayers" defaultMessage="Max Players" />
              </label>
              <input
                id="maxPlayers"
                type="number"
                min={2}
                max={32}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                disabled={isCreating}
                aria-label={intl.formatMessage({ id: 'host.maxPlayers', defaultMessage: 'Max Players' })}
                className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium mb-1">
                <FormattedMessage id="host.language" defaultMessage="Language" />
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isCreating}
                aria-label={intl.formatMessage({ id: 'host.language', defaultMessage: 'Language' })}
                className="w-full px-4 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {/* Player Engagement Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              <FormattedMessage id="host.engagementType" defaultMessage="Game Mode" />
            </label>
            <p className="text-xs opacity-75 mb-3">
              <FormattedMessage 
                id="host.engagementType.description" 
                defaultMessage="Choose how players will answer questions during the game" 
              />
            </p>
            <div className="space-y-2">
              {/* Multiple Choice Option */}
              <label 
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                  playerEngagementType === 'CHOICE_ANSWER' 
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10' 
                    : 'border-[var(--fg)]/20 hover:border-[var(--fg)]/40'
                } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="engagementType"
                  value="CHOICE_ANSWER"
                  checked={playerEngagementType === 'CHOICE_ANSWER'}
                  onChange={(e) => setPlayerEngagementType(e.target.value as PlayerEngagementType)}
                  disabled={isCreating}
                  aria-label={intl.formatMessage({ id: 'host.engagementType.multipleChoice', defaultMessage: 'Multiple Choice' })}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium mb-1">
                    <FormattedMessage id="host.engagementType.multipleChoice" defaultMessage="Multiple Choice" />
                    <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--accent)] text-white rounded">
                      <FormattedMessage id="host.engagementType.default" defaultMessage="Default" />
                    </span>
                  </div>
                  <p className="text-sm opacity-75">
                    <FormattedMessage 
                      id="host.engagementType.multipleChoice.description" 
                      defaultMessage="Players select from answer options. Great for trivia and knowledge tests." 
                    />
                  </p>
                </div>
              </label>

              {/* Buzzer Mode Option */}
              <label 
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                  playerEngagementType === 'BUZZER' 
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10' 
                    : 'border-[var(--fg)]/20 hover:border-[var(--fg)]/40'
                } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="engagementType"
                  value="BUZZER"
                  checked={playerEngagementType === 'BUZZER'}
                  onChange={(e) => setPlayerEngagementType(e.target.value as PlayerEngagementType)}
                  disabled={isCreating}
                  aria-label={intl.formatMessage({ id: 'host.engagementType.buzzer', defaultMessage: 'Buzzer Mode' })}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <span>
                      <FormattedMessage id="host.engagementType.buzzer" defaultMessage="Buzzer Mode" />
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-yellow-500 text-black rounded">
                      <FormattedMessage id="host.engagementType.new" defaultMessage="New" />
                    </span>
                  </div>
                  <p className="text-sm opacity-75">
                    <FormattedMessage 
                      id="host.engagementType.buzzer.description" 
                      defaultMessage="First to buzz gets to answer. Team colors, 30-second timer, and host controls included." 
                    />
                  </p>
                </div>
              </label>

              {/* Voice Answer Option (Coming Soon) */}
              <label 
                className="flex items-start p-4 border-2 border-[var(--fg)]/10 rounded-lg opacity-50 cursor-not-allowed"
              >
                <input
                  type="radio"
                  name="engagementType"
                  value="VOICE_ANSWER"
                  disabled
                  aria-label={intl.formatMessage({ id: 'host.engagementType.voice', defaultMessage: 'Voice Answer' })}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <span>
                      <FormattedMessage id="host.engagementType.voice" defaultMessage="Voice Answer" />
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--fg)]/20 rounded">
                      <FormattedMessage id="host.engagementType.comingSoon" defaultMessage="Coming Soon" />
                    </span>
                  </div>
                  <p className="text-sm opacity-75">
                    <FormattedMessage 
                      id="host.engagementType.voice.description" 
                      defaultMessage="Players speak their answers using voice recognition. Perfect for open-ended questions." 
                    />
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            aria-label={intl.formatMessage({ id: 'host.createButton', defaultMessage: 'Create Session' })}
            className="w-full px-6 py-3 bg-[var(--accent)] text-white rounded font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isCreating ? (
              <FormattedMessage id="host.creating" defaultMessage="Creating..." />
            ) : (
              <FormattedMessage id="host.createButton" defaultMessage="Create Session" />
            )}
          </button>
        </form>
      </div>

      {/* Sessions List */}
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="host.dashboard.sessions" defaultMessage="Recent Sessions" />
          </h3>
          <button
            onClick={loadSessions}
            disabled={isLoadingSessions}
            aria-label={intl.formatMessage({ id: 'common.refresh', defaultMessage: 'Refresh' })}
            className="px-3 py-1 text-sm border border-[var(--fg)]/20 rounded hover:bg-[var(--fg)]/5 transition disabled:opacity-50"
          >
            <FormattedMessage id="common.refresh" defaultMessage="Refresh" />
          </button>
        </div>

        {isLoadingSessions ? (
          <p className="text-center py-8 opacity-75">
            <FormattedMessage id="common.loading" defaultMessage="Loading..." />
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-center py-8 opacity-75">
            <FormattedMessage id="host.dashboard.noSessions" defaultMessage="No sessions yet. Create your first one above!" />
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border border-[var(--fg)]/10 rounded p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-lg">
                      <FormattedMessage
                        id="host.session.code"
                        defaultMessage="Session {code}"
                        values={{ code: session.code }}
                      />
                    </div>
                    <div className="text-sm opacity-75 mt-1">
                      <FormattedMessage
                        id="host.session.details"
                        defaultMessage="{status} • {participants} participants • {teams} teams"
                        values={{
                          status: session.status,
                          participants: session.participants.length,
                          teams: session.teams.length,
                        }}
                      />
                      <div className="mt-1 text-xs">
                        <span className="opacity-60 mr-1">Mode:</span>
                        <span className="uppercase tracking-wide">
                          {session.playerEngagementType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                      {session.status}
                    </span>
                    <button
                      onClick={() => dispatch(setHostSession(session))}
                      aria-label={intl.formatMessage({ id: 'host.session.manage', defaultMessage: 'Manage' })}
                      className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded font-medium hover:opacity-90 transition"
                    >
                      <FormattedMessage id="host.session.manage" defaultMessage="Manage" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
