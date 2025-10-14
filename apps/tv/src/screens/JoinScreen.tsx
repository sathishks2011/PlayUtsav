import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useState } from 'react';

interface NumberButtonProps {
  number: string;
  onPress: (num: string) => void;
}

const NumberButton = ({ number, onPress }: NumberButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePress = () => {
    if (isProcessing) {
      console.log('[NumberButton] Debounced - already processing:', number);
      return;
    }
    
    console.log('[NumberButton] Pressed:', number);
    setIsProcessing(true);
    onPress(number);
    
    // Reset after 500ms to prevent multiple triggers
    setTimeout(() => setIsProcessing(false), 500);
  };
  
  const { ref, focused } = useFocusable({
    onEnterPress: handlePress,
  });

  return (
    <button
      ref={ref}
      className={focused ? 'number-button-focused' : 'number-button'}
      onClick={handlePress}
      onMouseDown={(e) => e.preventDefault()}
    >
      {number}
    </button>
  );
};

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'delete' | 'submit';
}

const ActionButton = ({ label, onPress, variant = 'delete' }: ActionButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePress = () => {
    if (isProcessing) {
      console.log('[ActionButton] Debounced - already processing:', label);
      return;
    }
    
    console.log('[ActionButton] Pressed:', label);
    setIsProcessing(true);
    onPress();
    
    // Reset after 500ms to prevent multiple triggers
    setTimeout(() => setIsProcessing(false), 500);
  };
  
  const { ref, focused } = useFocusable({
    onEnterPress: handlePress,
  });

  const baseClass = variant === 'submit' ? 'action-button-submit' : 'action-button-delete';
  const focusedClass = variant === 'submit' ? 'action-button-submit-focused' : 'action-button-delete-focused';

  return (
    <button
      ref={ref}
      className={focused ? focusedClass : baseClass}
      onClick={handlePress}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
};

interface JoinScreenProps {
  onJoin: (code: string) => void;
}

export default function JoinScreen({ onJoin }: JoinScreenProps) {
  const { ref, focusKey, focusSelf } = useFocusable();
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  const handleNumberPress = (num: string) => {
    if (code.length < 4) {
      setCode(code + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setCode(code.slice(0, -1));
    setError('');
  };

  const handleSubmit = () => {
    if (code.length === 4) {
      onJoin(code);
    } else {
      setError('Please enter a 4-digit code');
    }
  };

  const renderCodeDisplay = () => {
    const digits = code.split('');
    const emptySlots = 4 - digits.length;
    
    return (
      <div className="code-display">
        {digits.map((digit, index) => (
          <div key={index} className="code-digit filled">
            {digit}
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="code-digit empty">
            _
          </div>
        ))}
      </div>
    );
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="join-screen">
        <div className="join-content">
          <h1 className="join-title">Enter 4-Digit Session Code</h1>
          
          {renderCodeDisplay()}
          
          {error && (
            <div className="join-error">
              {error}
            </div>
          )}

          <div className="number-pad">
            {/* Row 1: A-J */}
            <div className="number-row">
              <NumberButton number="A" onPress={handleNumberPress} />
              <NumberButton number="B" onPress={handleNumberPress} />
              <NumberButton number="C" onPress={handleNumberPress} />
              <NumberButton number="D" onPress={handleNumberPress} />
              <NumberButton number="E" onPress={handleNumberPress} />
              <NumberButton number="F" onPress={handleNumberPress} />
              <NumberButton number="G" onPress={handleNumberPress} />
              <NumberButton number="H" onPress={handleNumberPress} />
              <NumberButton number="I" onPress={handleNumberPress} />
              <NumberButton number="J" onPress={handleNumberPress} />
            </div>
            {/* Row 2: K-T */}
            <div className="number-row">
              <NumberButton number="K" onPress={handleNumberPress} />
              <NumberButton number="L" onPress={handleNumberPress} />
              <NumberButton number="M" onPress={handleNumberPress} />
              <NumberButton number="N" onPress={handleNumberPress} />
              <NumberButton number="O" onPress={handleNumberPress} />
              <NumberButton number="P" onPress={handleNumberPress} />
              <NumberButton number="Q" onPress={handleNumberPress} />
              <NumberButton number="R" onPress={handleNumberPress} />
              <NumberButton number="S" onPress={handleNumberPress} />
              <NumberButton number="T" onPress={handleNumberPress} />
            </div>
            {/* Row 3: U-Z + 0-3 */}
            <div className="number-row">
              <NumberButton number="U" onPress={handleNumberPress} />
              <NumberButton number="V" onPress={handleNumberPress} />
              <NumberButton number="W" onPress={handleNumberPress} />
              <NumberButton number="X" onPress={handleNumberPress} />
              <NumberButton number="Y" onPress={handleNumberPress} />
              <NumberButton number="Z" onPress={handleNumberPress} />
              <NumberButton number="0" onPress={handleNumberPress} />
              <NumberButton number="1" onPress={handleNumberPress} />
              <NumberButton number="2" onPress={handleNumberPress} />
              <NumberButton number="3" onPress={handleNumberPress} />
            </div>
            {/* Row 4: 4-9 + Actions */}
            <div className="number-row">
              <NumberButton number="4" onPress={handleNumberPress} />
              <NumberButton number="5" onPress={handleNumberPress} />
              <NumberButton number="6" onPress={handleNumberPress} />
              <NumberButton number="7" onPress={handleNumberPress} />
              <NumberButton number="8" onPress={handleNumberPress} />
              <NumberButton number="9" onPress={handleNumberPress} />
              <ActionButton label="Delete" onPress={handleDelete} variant="delete" />
              <ActionButton label="Join" onPress={handleSubmit} variant="submit" />
            </div>
          </div>

          <div className="join-instructions">
            <p>Use arrow keys to navigate • Press OK to select</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
