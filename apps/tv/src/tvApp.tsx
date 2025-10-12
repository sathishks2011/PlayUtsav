import { useEffect, useMemo, useState } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { Session, QuizState } from '@pkg/core';
import { computeTeamScores } from '@pkg/core';
import { fetchSessionByCode, fetchQuizState } from './lib/api';
import { getSessionSocket } from './lib/socket';

export default function TvApp() {
  const { ref, focusKey } = useFocusable();
  const [code, setCode] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [Connecting... setConnecting... = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!quiz) {
      setTimeLeft(null);
      return;
    }
    const compute = () => {
      const start = new Date(quiz.createdAt).getTime();
      const remaining = quiz.duration - (Date.now() - start) / 1000;
      return Math.max(Number.isFinite(remaining) ? remaining : 0, 0);
    };
    setTimeLeft(compute());
    const interval = window.setInterval(() => setTimeLeft(compute()), 500);
    return () => window.clearInterval(interval);
  }, [quiz?.questionId, quiz?.createdAt, quiz?.duration]);

  const disconnect = async (sessionId: string) => {
    const socket = await getSessionSocket();
    socket.offQuiz(sessionId);
    socket.unsubscribe(sessionId);
  };

  useEffect(() => {
    return () => {
      if (session) disconnect(session.id);
    };
  }, [session?.id]);

  const connect = async () => {
    setConnecting...true);
    try {
      if (session) await disconnect(session.id);
      const found = await fetchSessionByCode(code.trim().toUpperCase());
      if (!found) {
        setError('Session not found');
        setSession(null);
        setQuiz(null);
        return;
      }
      setSession(found);
      const socket = await getSessionSocket();
      socket.subscribe(found.id, (snapshot) => {
        if (snapshot) setSession(snapshot);
      });
      socket.onQuiz(found.id, (state) => {
        setQuiz(state);
      });
      const initialQuiz = await fetchQuizState(found.id);
      setQuiz(initialQuiz);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to connect');
    } finally {
      setConnecting...false);
    }
  };

  const scores = useMemo(() => (session ? computeTeamScores(session) : []), [session]);
  const quizProgress = (() => {
    if (!quiz || quiz.duration <= 0 || timeLeft == null) return 0;
    return Math.max(Math.min(timeLeft / quiz.duration, 1), 0);
  })();

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="min-h-screen px-10 py-12 flex flex-col gap-8 bg-gradient-to-br from-[#0f172a] to-[#15213b] text-slate-100"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight">PlayUtsav · TV</h1>
          <p className="opacity-70 mt-2 text-sm">Live scoreboard and quiz view for the big screen.</p>
        </div>

        <section className="rounded-2xl bg-white/10 backdrop-blur px-6 py-5 w-full max-w-3xl space-y-4">
          <h2 className="text-xl font-semibold">Enter session code</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full sm:w-auto flex-1 rounded border border-white/20 bg-black/40 px-4 py-3 text-lg tracking-[0.4em] text-center"
              placeholder="H7QX"
            />
            <button
              onClick={connect}
              disabled={Connecting...|| code.length !== 4}
              className="px-5 py-3 rounded bg-sky-500/70 hover:bg-sky-500 transition disabled:opacity-40"
            >
              {Connecting...? 'Connecting...' : 'Connect'}
            </button>
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </section>

        {session && (
          <section className="rounded-2xl bg-white/5 backdrop-blur px-6 py-5 w-full max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] opacity-60">Session</p>
                <h2 className="text-2xl font-semibold">{session.code}</h2>
              </div>
              <div className="text-sm opacity-70">
                {session.participants.length} players / {session.maxPlayers}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {scores.map(({ team, total, streak }) => (
                <div key={team.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: team.color ?? '#5b8cff' }}>
                      {team.name}
                    </span>
                    <span className="text-2xl font-bold">{total}</span>
                  </div>
                  {streak > 0 && (
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-200 mt-2">Racha: {streak}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm opacity-70 flex flex-wrap gap-2">
              {session.participants.map((p) => (
                <span key={p.id} className="px-2 py-1 rounded bg-white/10">{p.displayName}</span>
              ))}
            </div>
          </section>
        )}

        {quiz && (
          <section className="rounded-2xl bg-white/5 backdrop-blur px-6 py-5 w-full max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live quiz</h2>
              <span className="text-sm uppercase tracking-[0.2em] opacity-60">{quiz.status}</span>
            </div>
            <p className="text-lg font-medium">{quiz.prompt}</p>
            <div className="text-xs uppercase tracking-[0.2em] opacity-70">
              Tiempo restante: {Math.ceil(timeLeft ?? quiz.duration)}s
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-sky-400 transition-transform origin-left" style={{ transform: `scaleX(${quizProgress})` }} />
            </div>
            <ol className="space-y-2">
              {quiz.options.map((option, index) => (
                <li
                  key={option}
                  className={`rounded-xl border border-white/10 px-4 py-3 flex justify-between items-center ${
                    quiz.status === 'revealed' && quiz.correctOption === index
                      ? 'bg-emerald-500/20 border-emerald-400/40'
                      : 'bg-black/30'
                  }`}
                >
                  <span>{option}</span>
                  {quiz.status === 'revealed' && quiz.correctOption === index && (
                    <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">Correcta</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </FocusContext.Provider>
  );
}
