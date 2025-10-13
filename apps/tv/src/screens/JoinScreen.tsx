import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, useState } from 'react';

interface NumberButtonProps {
  number: string;
  onPress: (num: string) => void;
}

const NumberButton = ({ number, onPress }: NumberButtonProps) => {
  const { ref, focused } = useFocusable({
    onEnterPress: () => onPress(number),
  });

  return (
    <button
      ref={ref}
      className={focused ? 'number-button-focused' : 'number-button'}
      onClick={() => onPress(number)}
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
  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
  });

  const baseClass = variant === 'submit' ? 'action-button-submit' : 'action-button-delete';
  const focusedClass = variant === 'submit' ? 'action-button-submit-focused' : 'action-button-delete-focused';

  return (
    <button
      ref={ref}
      className={focused ? focusedClass : baseClass}
      onClick={onPress}
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
    if (code.length < 6) {
      setCode(code + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setCode(code.slice(0, -1));
    setError('');
  };

  const handleSubmit = () => {
    if (code.length === 6) {
      onJoin(code);
    } else {
      setError('Please enter a 6-digit code');
    }
  };

  const renderCodeDisplay = () => {
    const digits = code.split('');
    const emptySlots = 6 - digits.length;
    
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
          <h1 className="join-title">Enter Session Code</h1>
          
          {renderCodeDisplay()}
          
          {error && (
            <div className="join-error">
              {error}
            </div>
          )}

          <div className="number-pad">
            <div className="number-row">
              <NumberButton number="1" onPress={handleNumberPress} />
              <NumberButton number="2" onPress={handleNumberPress} />
              <NumberButton number="3" onPress={handleNumberPress} />
            </div>
            <div className="number-row">
              <NumberButton number="4" onPress={handleNumberPress} />
              <NumberButton number="5" onPress={handleNumberPress} />
              <NumberButton number="6" onPress={handleNumberPress} />
            </div>
            <div className="number-row">
              <NumberButton number="7" onPress={handleNumberPress} />
              <NumberButton number="8" onPress={handleNumberPress} />
              <NumberButton number="9" onPress={handleNumberPress} />
            </div>
            <div className="number-row">
              <ActionButton label="Delete" onPress={handleDelete} variant="delete" />
              <NumberButton number="0" onPress={handleNumberPress} />
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
