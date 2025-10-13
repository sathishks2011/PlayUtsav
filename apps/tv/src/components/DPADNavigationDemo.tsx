import { useState } from 'react';
import { DPADNavigationProvider } from '../components/DPADNavigationProvider';
import { FocusableButton } from '../components/FocusableButton';
import { useFocusable } from '../hooks/useFocusable';

/**
 * Demo component showcasing DPAD navigation
 * Use arrow keys to navigate, Enter to select, Escape to go back
 */
export function DPADNavigationDemo() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const handleBack = () => {
    if (showGrid) {
      setShowGrid(false);
    } else {
      console.log('Back pressed from main menu');
    }
  };

  return (
    <DPADNavigationProvider
      initialFocusId="btn-1"
      onBack={handleBack}
      wrapAround={true}
      debug={true}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-8 text-center">
            DPAD Navigation Demo
          </h1>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
            <h2 className="text-3xl text-white mb-4">Controls:</h2>
            <ul className="text-white text-xl space-y-2">
              <li>• Arrow Keys: Navigate</li>
              <li>• Enter / Space: Select</li>
              <li>• Escape / Backspace: Back</li>
            </ul>
          </div>

          {!showGrid ? (
            <MainMenu
              onSelect={setSelectedOption}
              onShowGrid={() => setShowGrid(true)}
            />
          ) : (
            <GridDemo onBack={() => setShowGrid(false)} />
          )}

          {selectedOption && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg text-2xl shadow-2xl">
              Selected: {selectedOption}
            </div>
          )}
        </div>
      </div>
    </DPADNavigationProvider>
  );
}

function MainMenu({
  onSelect,
  onShowGrid,
}: {
  onSelect: (option: string) => void;
  onShowGrid: () => void;
}) {
  const options = [
    { id: 'btn-1', label: 'Start Game', variant: 'primary' as const },
    { id: 'btn-2', label: 'Join Game', variant: 'secondary' as const },
    { id: 'btn-3', label: 'Settings', variant: 'outline' as const },
    { id: 'btn-4', label: 'Show Grid Demo', variant: 'ghost' as const },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl text-white mb-8 text-center">Main Menu</h2>
      <div className="flex flex-col items-center space-y-6">
        {options.map((option, index) => {
          const ref = useFocusable({
            id: option.id,
            onSelect: () => {
              if (option.id === 'btn-4') {
                onShowGrid();
              } else {
                onSelect(option.label);
              }
            },
          });

          return (
            <FocusableButton
              key={option.id}
              ref={ref}
              focusId={option.id}
              variant={option.variant}
              size="xl"
              onClick={() => {
                if (option.id === 'btn-4') {
                  onShowGrid();
                } else {
                  onSelect(option.label);
                }
              }}
              className="w-96"
            >
              {option.label}
            </FocusableButton>
          );
        })}
      </div>
    </div>
  );
}

function GridDemo({ onBack }: { onBack: () => void }) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const gridItems = Array.from({ length: 12 }, (_, i) => ({
    id: `grid-${i + 1}`,
    label: `Item ${i + 1}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl text-white">Grid Navigation Demo</h2>
        <BackButton onBack={onBack} />
      </div>

      <div className="grid grid-cols-4 gap-6">
        {gridItems.map((item) => {
          const ref = useFocusable({
            id: item.id,
            onSelect: () => setSelectedCell(item.label),
          });

          return (
            <FocusableButton
              key={item.id}
              ref={ref}
              focusId={item.id}
              variant="outline"
              size="lg"
              onClick={() => setSelectedCell(item.label)}
              className="aspect-square"
            >
              {item.label}
            </FocusableButton>
          );
        })}
      </div>

      {selectedCell && (
        <div className="text-center text-white text-2xl mt-8">
          Last Selected: {selectedCell}
        </div>
      )}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  const ref = useFocusable({
    id: 'btn-back',
    onSelect: onBack,
  });

  return (
    <FocusableButton
      ref={ref}
      focusId="btn-back"
      variant="secondary"
      size="md"
      onClick={onBack}
    >
      ← Back
    </FocusableButton>
  );
}
