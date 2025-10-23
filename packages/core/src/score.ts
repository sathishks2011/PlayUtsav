import type { Session, Team } from './types';

export type TeamScore = {
  team: Team;
  total: number;
  streak: number;
};

export function computeTeamScores(session: Session, gameType?: 'quiz' | 'bioscope' | null): TeamScore[] {
  const totals = new Map<string, { total: number; streak: number; current: number }>();

  if (gameType !== undefined) {
    // Single game type: use cumulative value from latest score
    const relevantScores = session.scores.filter(score => score.gameType === gameType);
    const sortedScores = [...relevantScores].sort(
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
  } else {
    // All games: sum the latest score.value from each game type
    const gameTypes = ['quiz', 'bioscope'];

    gameTypes.forEach((type) => {
      const gameScores = session.scores.filter(score => score.gameType === type);
      if (gameScores.length === 0) return;

      // Group by team and get latest score for this game type
      const latestByTeam = new Map<string, typeof gameScores[0]>();
      gameScores.forEach((score) => {
        const teamId = score.teamId ?? 'unassigned';
        const existing = latestByTeam.get(teamId);
        if (!existing || new Date(score.recordedAt) > new Date(existing.recordedAt)) {
          latestByTeam.set(teamId, score);
        }
      });

      // Add the latest value from this game type to the team's total
      latestByTeam.forEach((score, teamId) => {
        const record = totals.get(teamId) ?? { total: 0, streak: 0, current: 0 };
        record.total += score.value ?? 0;
        totals.set(teamId, record);
      });
    });

    // Calculate streak across all games (chronologically)
    const allScoresSorted = [...session.scores].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const streakTracking = new Map<string, { current: number; max: number }>();
    allScoresSorted.forEach((score) => {
      const teamId = score.teamId ?? 'unassigned';
      const tracking = streakTracking.get(teamId) ?? { current: 0, max: 0 };

      if (score.delta > 0) {
        tracking.current += 1;
        if (tracking.current > tracking.max) tracking.max = tracking.current;
      } else if (score.delta < 0) {
        tracking.current = 0;
      }

      streakTracking.set(teamId, tracking);
    });

    // Update streak values in totals
    streakTracking.forEach((tracking, teamId) => {
      const record = totals.get(teamId);
      if (record) {
        record.streak = tracking.max;
      }
    });
  }

  return session.teams.map((team) => {
    const record = totals.get(team.id) ?? { total: 0, streak: 0, current: 0 };
    return {
      team,
      total: record.total,
      streak: record.streak,
    };
  });
}

