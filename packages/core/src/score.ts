import type { Session, Team } from './types';

export type TeamScore = {
  team: Team;
  total: number;
  streak: number;
};

export function computeTeamScores(session: Session): TeamScore[] {
  const totals = new Map<string, { total: number; streak: number; current: number }>();

  const sortedScores = [...session.scores].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  sortedScores.forEach((score) => {
    const key = score.teamId ?? 'unassigned';
    const record = totals.get(key) ?? { total: 0, streak: 0, current: 0 };
    const running = record.total + score.delta;
    record.total = score.value ?? running;

    if (score.delta > 0) {
      record.current += 1;
      if (record.current > record.streak) record.streak = record.current;
    } else if (score.delta < 0) {
      record.current = 0;
    }

    totals.set(key, record);
  });

  return session.teams.map((team) => {
    const record = totals.get(team.id) ?? { total: 0, streak: 0, current: 0 };
    return {
      team,
      total: record.total,
      streak: record.streak,
    };
  });
}

