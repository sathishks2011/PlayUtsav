import { useEffect, useMemo, useState } from 'react';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface ScoreboardScreenProps {
  teams: Team[];
  sessionCode: string;
}

const RANK_LABELS = ['1st', '2nd', '3rd'];

export default function ScoreboardScreen({ teams, sessionCode }: ScoreboardScreenProps) {
  const [animatedScores, setAnimatedScores] = useState<Map<string, number>>(new Map());
  const [showConfetti, setShowConfetti] = useState(false);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.score - a.score);
  }, [teams]);

  useEffect(() => {
    setAnimatedScores((previous) => {
      const nextScores = new Map<string, number>();

      sortedTeams.forEach((team) => {
        const currentScore = previous.get(team.id) || 0;

        if (currentScore < team.score) {
          const increment = Math.ceil((team.score - currentScore) / 10);
          nextScores.set(team.id, Math.min(currentScore + increment, team.score));
        } else {
          nextScores.set(team.id, team.score);
        }
      });

      return nextScores;
    });
  }, [sortedTeams]);

  useEffect(() => {
    if (sortedTeams.length === 0) {
      return;
    }

    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [sortedTeams]);

  const maxScore = Math.max(...sortedTeams.map((team) => team.score), 1);

  return (
    <div className="scoreboard-screen">
      <div className="scoreboard-header">
        <h1 className="scoreboard-title">Leaderboard</h1>
        <div className="session-info-badge">Session: {sessionCode}</div>
      </div>

      {showConfetti && sortedTeams.length > 0 && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, index) => (
            <div key={index} className="confetti" />
          ))}
        </div>
      )}

      <div className="scoreboard-list">
        {sortedTeams.length === 0 ? (
          <div className="scoreboard-empty">
            <p className="scoreboard-empty-title">No scores yet</p>
            <p className="scoreboard-empty-subtitle">
              Results will appear here after the first round finishes.
            </p>
          </div>
        ) : (
          sortedTeams.map((team, index) => {
            const displayScore = animatedScores.get(team.id) || 0;
            const percentage = (displayScore / maxScore) * 100;
            const rankLabel = RANK_LABELS[index] || `#${index + 1}`;
            const isLeader = index === 0;

            return (
              <div key={team.id} className={`scoreboard-item ${isLeader ? 'leader' : ''}`}>
                <div className="rank-badge" style={{ borderColor: team.color }}>
                  {rankLabel}
                </div>

                <div className="team-info-score">
                  <div className="team-name-score">
                    <span
                      className="team-color-dot"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </div>
                  <div className="score-bar-container-score">
                    <div
                      className="score-bar-score"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: team.color,
                      }}
                    />
                  </div>
                </div>

                <div className="team-score-display">
                  <span className="score-value">{Math.round(displayScore)}</span>
                  <span className="score-label">pts</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="scoreboard-footer">
        <p className="footer-message">
          {sortedTeams.length > 0
            ? `${sortedTeams[0].name} is in the lead!`
            : 'Waiting for scores...'}
        </p>
      </div>
    </div>
  );
}
