import { useEffect, useState } from 'react';

interface Team {
  name: string;
  score: number;
  color: string;
}

interface ScreenSaverProps {
  sessionCode?: string;
  sessionName?: string;
  teams?: Team[];
  onDismiss: () => void;
}

export default function ScreenSaver({
  sessionCode = 'XXXXXX',
  sessionName = 'PlayUtsav Quiz',
  teams = [],
  onDismiss,
}: ScreenSaverProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 2, y: 2 });

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rotate through teams every 5 seconds
  useEffect(() => {
    if (teams.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [teams.length]);

  // Bouncing logo animation
  useEffect(() => {
    const maxX = window.innerWidth - 300; // logo width
    const maxY = window.innerHeight - 200; // logo height

    const interval = setInterval(() => {
      setLogoPosition((prev) => {
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let newVelocityX = velocity.x;
        let newVelocityY = velocity.y;

        // Bounce off edges
        if (newX <= 0 || newX >= maxX) {
          newVelocityX = -velocity.x;
          newX = newX <= 0 ? 0 : maxX;
        }

        if (newY <= 0 || newY >= maxY) {
          newVelocityY = -velocity.y;
          newY = newY <= 0 ? 0 : maxY;
        }

        if (newVelocityX !== velocity.x || newVelocityY !== velocity.y) {
          setVelocity({ x: newVelocityX, y: newVelocityY });
        }

        return { x: newX, y: newY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [velocity]);

  // Dismiss on any interaction
  useEffect(() => {
    const handleInteraction = () => {
      onDismiss();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [onDismiss]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const currentTeam = teams[currentTeamIndex];

  return (
    <div 
      className="screensaver"
      style={
        {
          '--logo-x': `${logoPosition.x}px`,
          '--logo-y': `${logoPosition.y}px`,
        } as React.CSSProperties
      }
    >
      {/* Floating Logo */}
      <div className="screensaver-logo">
        <div className="logo-content">
          <h1 className="logo-text">PlayUtsav</h1>
          <p className="logo-tagline">Interactive Quiz Platform</p>
        </div>
      </div>

      {/* Session Info - Top Left */}
      <div className="screensaver-info top-left">
        <div className="info-card">
          <p className="info-label">Session Code</p>
          <p className="info-value">{sessionCode}</p>
        </div>
      </div>

      {/* Session Name - Top Right */}
      <div className="screensaver-info top-right">
        <div className="info-card">
          <p className="info-label">Session</p>
          <p className="info-value">{sessionName}</p>
        </div>
      </div>

      {/* Current Time - Bottom Right */}
      <div className="screensaver-info bottom-right">
        <div className="info-card">
          <p className="info-label">Current Time</p>
          <p className="info-value">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Team Scores - Bottom Left */}
      {teams.length > 0 && currentTeam && (
        <div className="screensaver-info bottom-left">
          <div className="info-card team-card">
            <p className="info-label">Current Leader</p>
            <div className="team-info">
              <p className="team-name">{currentTeam.name}</p>
              <p className="team-score">{currentTeam.score} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* Dismissal hint */}
      <div className="screensaver-hint">
        Press any key to continue
      </div>
    </div>
  );
}
