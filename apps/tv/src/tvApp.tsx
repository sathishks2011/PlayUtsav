import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useState } from 'react';

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
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastKey, setLastKey] = useState<string>('');
  const [currentFocus, setCurrentFocus] = useState<number>(0);
  
  const menuItems = ['Play', 'Settings', 'Exit'];

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
  };

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
