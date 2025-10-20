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
      return;
    }

    setIsProcessing(true);
    onPress(number);

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
      onMouseDown={(event) => event.preventDefault()}
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
      return;
    }

    setIsProcessing(true);
    onPress();
    setTimeout(() => setIsProcessing(false), 500);
  };

  const { ref, focused } = useFocusable({
    onEnterPress: handlePress,
  });

  const baseClass = variant === 'submit' ? 'action-button-submit' : 'action-button-delete';
  const focusedClass =
    variant === 'submit' ? 'action-button-submit-focused' : 'action-button-delete-focused';

  return (
    <button
      ref={ref}
      className={focused ? focusedClass : baseClass}
      onClick={handlePress}
      onMouseDown={(event) => event.preventDefault()}
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
      setCode((value) => value + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setCode((value) => value.slice(0, -1));
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

          {error && <div className="join-error">{error}</div>}

          <div className="number-pad">
            <div className="number-row">
              {'ABCDEFGHIJ'.split('').map((letter) => (
                <NumberButton key={letter} number={letter} onPress={handleNumberPress} />
              ))}
            </div>

            <div className="number-row">
              {'KLMNOPQRST'.split('').map((letter) => (
                <NumberButton key={letter} number={letter} onPress={handleNumberPress} />
              ))}
            </div>

            <div className="number-row">
              {'UVWXYZ0123'.split('').map((char) => (
                <NumberButton key={char} number={char} onPress={handleNumberPress} />
              ))}
            </div>

            <div className="number-row">
              {'456789'.split('').map((char) => (
                <NumberButton key={char} number={char} onPress={handleNumberPress} />
              ))}
              <ActionButton label="Delete" onPress={handleDelete} variant="delete" />
              <ActionButton label="Join" onPress={handleSubmit} variant="submit" />
            </div>
          </div>

          <div className="join-instructions">
            <p>Use arrow keys to navigate - Press OK to select</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
