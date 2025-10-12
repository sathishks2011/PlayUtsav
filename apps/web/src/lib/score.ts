import type { Session, Team } from '@pkg/core';

export type TeamScore = {
  team: Team;
  total: number;
};

export function computeTeamScores(session: Session): TeamScore[] {
  const totals = new Map<string, number>();
  session.scores.forEach((score) => {
    const key = score.teamId ?? 'unassigned';
    totals.set(key, (totals.get(key) ?? 0) + score.delta);
    if (score.value && score.value > totals.get(key)!) {
      totals.set(key, score.value);
    }
  });
  return session.teams.map((team) => ({
    team,
    total: totals.get(team.id) ?? 0,
  }));
}
