import { useEffect, useState } from 'react';

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

export default function ScoreboardScreen({ teams, sessionCode }: ScoreboardScreenProps) {
  const [animatedScores, setAnimatedScores] = useState<Map<string, number>>(new Map());
  const [showConfetti, setShowConfetti] = useState(false);

  // Sort teams by score
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  // Animate scores
  useEffect(() => {
    const newScores = new Map<string, number>();
    
    sortedTeams.forEach((team) => {
      const currentScore = animatedScores.get(team.id) || 0;
      
      if (currentScore < team.score) {
        // Animate score increase
        const increment = Math.ceil((team.score - currentScore) / 10);
        newScores.set(team.id, Math.min(currentScore + increment, team.score));
      } else {
        newScores.set(team.id, team.score);
      }
    });

    setAnimatedScores(newScores);
  }, [teams, sortedTeams]);

  // Show confetti for leader
  useEffect(() => {
    if (sortedTeams.length > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sortedTeams]);

  const maxScore = Math.max(...sortedTeams.map(t => t.score), 1);

  return (
    <div className="scoreboard-screen">
      {/* Header */}
      <div className="scoreboard-header">
        <h1 className="scoreboard-title">🏆 Leaderboard</h1>
        <div className="session-info-badge">
          Session: {sessionCode}
        </div>
      </div>

      {/* Confetti effect for winner */}
      {showConfetti && sortedTeams.length > 0 && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="confetti" />
          ))}
        </div>
      )}

      {/* Scoreboard */}
      <div className="scoreboard-list">
        {sortedTeams.length === 0 ? (
          <div className="scoreboard-empty">
            <p className="scoreboard-empty-title">No players have answered yet</p>
            <p className="scoreboard-empty-subtitle">Scores will appear here after players answer</p>
          </div>
        ) : (
          sortedTeams.map((team, index) => {
            const displayScore = animatedScores.get(team.id) || 0;
            const percentage = (displayScore / maxScore) * 100;
            const isLeader = index === 0;
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

            return (
              <div 
                key={team.id} 
                className={`scoreboard-item ${isLeader ? 'leader' : ''}`}
              >
                <div className="rank-badge">
                  {rankEmoji || `#${index + 1}`}
                </div>

                <div className="team-info-score">
                  <div className="team-name-score">{team.name}</div>
                  <div className="score-bar-container-score">
                    <div 
                      className="score-bar-score"
                      style={{ width: `${percentage}%` }}
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

      {/* Footer message */}
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
