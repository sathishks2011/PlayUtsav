import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useState } from 'react';
import JoinScreen from './screens/JoinScreen';
import QuizScreen from './screens/QuizScreen';
import ScoreboardScreen from './screens/ScoreboardScreen';
import ScreenSaver from './components/ScreenSaver';
import { useIdleDetector } from './hooks/useIdleDetector';
import { fetchSessionByCode, fetchQuizState, fetchSessionScores } from './lib/api';
import { getSessionSocket } from './lib/socket';

type Screen = 'menu' | 'join' | 'lobby' | 'quiz' | 'scoreboard';
type Session = any; // We'll type this properly later
type QuizState = any;

interface TeamScore {
  id: string;
  name: string;
  score: number;
  color: string;
}

const MenuItem = ({
  label,
  onEnterPress,
  focused,
}: {
  label: string;
  onEnterPress: () => void;
  focused: boolean;
}) => {
  const { ref } = useFocusable({
    onEnterPress,
  });

  return (
    <div 
      ref={ref} 
      className={focused ? 'menu-item-focused' : 'menu-item'}
      onClick={onEnterPress}
      onTouchEnd={onEnterPress}
    >
      {label}
    </div>
  );
};

function App() {
  const { ref, focusKey, focusSelf } = useFocusable();
  const [currentScreen, setCurrentScreen] = useState<Screen>('join');
  const [session, setSession] = useState<Session | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [sessionCode, setSessionCode] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastKey, setLastKey] = useState<string>('');
  const [currentFocus, setCurrentFocus] = useState<number>(0);
  const [showScreenSaver, setShowScreenSaver] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [quizEndTimeout, setQuizEndTimeout] = useState<number | null>(null);
  
  const menuItems = ['Play', 'Settings', 'Exit'];

  // Detect idle state (2 minutes)
  useIdleDetector({
    timeout: 120000, // 2 minutes
    onIdle: () => setShowScreenSaver(true),
    onActive: () => setShowScreenSaver(false),
  });

  // Mock team data for screen saver and scoreboard
  const mockTeams = session ? [
    { id: '1', name: 'Team Alpha', score: 1250, color: '#e94560' },
    { id: '2', name: 'Team Beta', score: 1100, color: '#0f3460' },
    { id: '3', name: 'Team Gamma', score: 980, color: '#4caf50' },
  ] : [];

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setLastKey(`${event.key} (${event.code})`);
      console.log('Key pressed:', event.key, 'Code:', event.code, 'KeyCode:', event.keyCode);
      
      // Handle Enter, Space, or OK button (try multiple codes)
      if (
        event.key === 'Enter' || 
        event.key === ' ' || 
        event.code === 'Enter' ||
        event.keyCode === 13 || // Enter
        event.keyCode === 32 || // Space
        event.keyCode === 415 || // Play/Pause on some remotes
        event.code === 'MediaPlayPause'
      ) {
        event.preventDefault();
        handleMenuItemPress(menuItems[currentFocus]);
      }
      
      // Handle arrow keys
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
        event.preventDefault();
        setCurrentFocus((prev) => (prev + 1) % menuItems.length);
      }
      
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        event.preventDefault();
        setCurrentFocus((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('Key up:', event.key, 'Code:', event.code, 'KeyCode:', event.keyCode);
    };

    const handleClick = (event: MouseEvent) => {
      console.log('Click detected at:', event.clientX, event.clientY);
      setLastKey(`Click at ${event.clientX},${event.clientY}`);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
    };
  }, [currentFocus, menuItems]);

  const handleMenuItemPress = (item: string) => {
    setSelectedItem(item);
    setClickCount((prev) => prev + 1);
    console.log(`${item} button pressed!`);
    
    if (item === 'Play') {
      setCurrentScreen('join');
    }
  };

  const handleJoinSession = async (code: string) => {
    try {
      setDebugInfo('Step 1: Fetching session...');
      console.log('Joining session with code:', code);
      const foundSession = await fetchSessionByCode(code);
      
      if (!foundSession) {
        console.error('Session not found for code:', code);
        setDebugInfo('ERROR: Session not found');
        alert(`Session not found with code: ${code}. Please check the code and try again.`);
        return;
      }

      setDebugInfo('Step 2: Session found, setting state...');
      console.log('Session found:', foundSession);
      
      // Set everything at once
      setSession(foundSession);
      setSessionCode(code);
      setDebugInfo('Step 3: Switching to lobby screen...');
      
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        console.log('Setting screen to lobby NOW');
        setCurrentScreen('lobby');
        console.log('Screen should now be: lobby');
      }, 100);
      
      setDebugInfo('Step 4: Loading quiz state...');
      // Load initial quiz state
      const initialQuizState = await fetchQuizState(foundSession.id);
      console.log('Initial quiz state:', initialQuizState);
      if (initialQuizState) {
        setDebugInfo('Step 5: Quiz state loaded, updating screen...');
        setQuizState(initialQuizState);
        // Only update screen if quiz is already running, otherwise stay on lobby
        if (initialQuizState.status === 'running' || initialQuizState.status === 'revealed') {
          console.log('Quiz already started, going to quiz screen');
          updateScreenBasedOnQuizState(initialQuizState);
        } else {
          console.log('Quiz not started yet, staying on lobby');
        }
      } else {
        setDebugInfo('Step 5: No quiz state, staying on lobby');
      }
    } catch (error) {
      console.error('Failed to join session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDebugInfo(`ERROR: ${errorMessage}`);
      alert(`Failed to join session: ${errorMessage}. Please try again.`);
    }
  };

  const updateScreenBasedOnQuizState = (state: QuizState) => {
    console.log('Updating screen based on quiz state:', state.status);
    
    if (state.status === 'idle') {
      // Quiz hasn't started yet, stay on lobby
      console.log('Quiz status is idle, staying on lobby');
      setCurrentScreen('lobby');
    } else if (state.status === 'running') {
      // Quiz is active
      console.log('Quiz is running, switching to quiz screen');
      setCurrentScreen('quiz');
      // Clear any pending scoreboard timeout
      if (quizEndTimeout) {
        clearTimeout(quizEndTimeout);
        setQuizEndTimeout(null);
      }
    } else if (state.status === 'revealed') {
      // Quiz answer revealed - show for 5 seconds then go to scoreboard
      console.log('Quiz revealed, showing answer then going to scoreboard');
      setCurrentScreen('quiz');
      
      // Clear any existing timeout
      if (quizEndTimeout) {
        clearTimeout(quizEndTimeout);
      }
      
      // Wait 5 seconds then show scoreboard
      const timeout = window.setTimeout(async () => {
        console.log('Quiz reveal timeout - fetching scores and showing scoreboard');
        if (session) {
          try {
            const scores = await fetchSessionScores(session.id);
            console.log('Fetched scores:', scores);
            
            // Convert scores to team format
            if (scores && scores.players && scores.players.length > 0) {
              const teamScores: TeamScore[] = scores.players
                .map((player: any, index: number) => ({
                  id: player.id || player.participantId || `player-${index}`,
                  name: player.name || player.playerName || `Player ${index + 1}`,
                  score: player.totalScore || player.score || 0,
                  color: ['#e94560', '#0f3460', '#4caf50', '#ff9800', '#9c27b0'][index % 5],
                }))
                .sort((a: TeamScore, b: TeamScore) => b.score - a.score); // Sort by score descending
              
              console.log('Setting team scores:', teamScores);
              setTeams(teamScores);
            } else {
              console.log('No player scores found');
              setTeams([]);
            }
          } catch (error) {
            console.error('Error fetching scores:', error);
            setTeams([]);
          }
        }
        setCurrentScreen('scoreboard');
      }, 5000);
      
      setQuizEndTimeout(timeout);
    }
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (!session) return;

    const setupSocket = async () => {
      try {
        console.log('[TV App] Setting up WebSocket for session:', session.id);
        const socket = await getSessionSocket();
        
        // Subscribe to quiz state updates
        socket.onQuiz(session.id, (newQuizState: any) => {
          console.log('=== WEBSOCKET: Quiz state changed ===');
          console.log('New quiz state:', JSON.stringify(newQuizState, null, 2));
          console.log('Status:', newQuizState?.status);
          
          if (newQuizState) {
            setQuizState(newQuizState);
            updateScreenBasedOnQuizState(newQuizState);
          }
        });

        // Also subscribe to session updates (for participant changes, etc.)
        socket.subscribe(session.id, (updatedSession: any) => {
          console.log('[TV App] Session updated:', updatedSession);
          if (updatedSession) {
            setSession(updatedSession);
          }
        });

        console.log('[TV App] WebSocket setup complete');
      } catch (error) {
        console.error('Failed to setup socket:', error);
      }
    };

    setupSocket();

    return () => {
      // Cleanup
      getSessionSocket().then((socket) => {
        console.log('[TV App] Cleaning up WebSocket for session:', session.id);
        socket.offQuiz(session.id);
        socket.unsubscribe(session.id);
      }).catch(console.error);
    };
  }, [session]);

  // Render screen saver if idle
  if (showScreenSaver) {
    return (
      <ScreenSaver
        sessionCode={sessionCode || undefined}
        sessionName={session?.name || "PlayUtsav Quiz Night"}
        teams={mockTeams}
        onDismiss={() => setShowScreenSaver(false)}
      />
    );
  }

  // Render different screens based on current state
  if (currentScreen === 'join') {
    return <JoinScreen onJoin={handleJoinSession} />;
  }

  if (currentScreen === 'quiz' && quizState) {
    return <QuizScreen quizState={quizState} sessionCode={sessionCode} />;
  }

  if (currentScreen === 'scoreboard') {
    return <ScoreboardScreen teams={teams} sessionCode={sessionCode} />;
  }

  if (currentScreen === 'lobby') {
    return (
      <div className="app">
        <div className="content">
          <h1 className="title">PlayUtsav Quiz</h1>
          <div className="session-badge">
            <span className="badge-label">Session Code</span>
            <span className="badge-value">{sessionCode || 'Loading...'}</span>
          </div>
          <p className="lobby-message">✓ Connected! Waiting for host to start the quiz...</p>
          {session && (
            <div className="lobby-info">
              <p>Host: {session.hostName || 'Unknown'}</p>
              <p>Players: {session.participants?.length || 0}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="app">
        <div className="content">
          <h1 className="title">PlayUtsav TV</h1>
          
          {selectedItem && (
            <div className="feedback">
              <p>✓ {selectedItem} clicked!</p>
              <p>Total clicks: {clickCount}</p>
            </div>
          )}
          
          {lastKey && (
            <div className="debug">
              Last key: {lastKey}
            </div>
          )}
          
          <div className="menu">
            <MenuItem 
              label="Play" 
              onEnterPress={() => handleMenuItemPress('Play')} 
              focused={currentFocus === 0}
            />
            <MenuItem 
              label="Settings" 
              onEnterPress={() => handleMenuItemPress('Settings')} 
              focused={currentFocus === 1}
            />
            <MenuItem 
              label="Exit" 
              onEnterPress={() => handleMenuItemPress('Exit')} 
              focused={currentFocus === 2}
            />
          </div>
          
          <div className="instructions">
            <p>Use ↑↓ arrows to navigate • Press OK/Enter to select</p>
            <p className="focus-debug">Current focus: {menuItems[currentFocus]}</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

export default App;
