import { useEffect, useRef, useCallback, RefObject } from 'react';

export interface FocusableElement {
  id: string;
  ref: RefObject<HTMLElement>;
  position: { x: number; y: number; width: number; height: number };
  disabled?: boolean;
  onFocus?: () => void;
  onSelect?: () => void;
}

export interface UseDPADNavigationOptions {
  initialFocusId?: string;
  onBack?: () => void;
  onExit?: () => void;
  wrapAround?: boolean;
  debug?: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

interface NavigationMap {
  [key: string]: Partial<Record<Direction, string>>;
}

/**
 * Hook for managing DPAD navigation with spatial awareness
 * Automatically calculates the best next focus target based on arrow key direction
 */
export function useDPADNavigation(
  focusableElements: FocusableElement[],
  options: UseDPADNavigationOptions = {}
) {
  const { initialFocusId, onBack, onExit, wrapAround = false, debug = false } = options;
  const currentFocusIdRef = useRef<string | null>(initialFocusId || null);
  const navigationMapRef = useRef<NavigationMap>({});

  const log = useCallback(
    (...args: any[]) => {
      if (debug) {
        console.log('[DPAD Navigation]', ...args);
      }
    },
    [debug]
  );

  // Calculate spatial navigation map based on element positions
  const calculateNavigationMap = useCallback(() => {
    const map: NavigationMap = {};
    const activeElements = focusableElements.filter((el) => !el.disabled && el.ref.current);

    activeElements.forEach((element) => {
      const { id, position } = element;
      const centerX = position.x + position.width / 2;
      const centerY = position.y + position.height / 2;

      map[id] = {};

      // Find best candidate in each direction
      ['up', 'down', 'left', 'right'].forEach((direction) => {
        let bestCandidate: FocusableElement | null = null;
        let bestScore = Infinity;

        activeElements.forEach((candidate) => {
          if (candidate.id === id) return;

          const candCenterX = candidate.position.x + candidate.position.width / 2;
          const candCenterY = candidate.position.y + candidate.position.height / 2;

          const dx = candCenterX - centerX;
          const dy = candCenterY - centerY;

          let isInDirection = false;
          let primaryDistance = 0;
          let secondaryDistance = 0;

          switch (direction) {
            case 'up':
              isInDirection = dy < -10; // Must be significantly above
              primaryDistance = Math.abs(dy);
              secondaryDistance = Math.abs(dx);
              break;
            case 'down':
              isInDirection = dy > 10; // Must be significantly below
              primaryDistance = Math.abs(dy);
              secondaryDistance = Math.abs(dx);
              break;
            case 'left':
              isInDirection = dx < -10; // Must be significantly to the left
              primaryDistance = Math.abs(dx);
              secondaryDistance = Math.abs(dy);
              break;
            case 'right':
              isInDirection = dx > 10; // Must be significantly to the right
              primaryDistance = Math.abs(dx);
              secondaryDistance = Math.abs(dy);
              break;
          }

          if (isInDirection) {
            // Score based on primary distance and secondary alignment
            const score = primaryDistance + secondaryDistance * 0.5;
            if (score < bestScore) {
              bestScore = score;
              bestCandidate = candidate;
            }
          }
        });

        if (bestCandidate !== null) {
          const dirKey = direction as Direction;
          map[id][dirKey] = bestCandidate.id;
        }
      });
    });

    navigationMapRef.current = map;
    log('Navigation map calculated:', map);
  }, [focusableElements, log]);

  // Focus an element by ID
  const focusElement = useCallback(
    (id: string) => {
      const element = focusableElements.find((el) => el.id === id);
      if (!element || element.disabled) {
        log('Cannot focus element:', id, 'disabled or not found');
        return false;
      }

      if (element.ref.current) {
        element.ref.current.focus();
        currentFocusIdRef.current = id;
        element.onFocus?.();
        log('Focused element:', id);
        return true;
      }

      return false;
    },
    [focusableElements, log]
  );

  // Navigate in a direction
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const currentId = currentFocusIdRef.current;
      if (!currentId) {
        // No current focus, focus first element
        const firstEnabled = focusableElements.find((el) => !el.disabled);
        if (firstEnabled) {
          focusElement(firstEnabled.id);
        }
        return;
      }

      const navMap = navigationMapRef.current[currentId];
      const nextId = navMap?.[direction];

      if (nextId) {
        focusElement(nextId);
      } else if (wrapAround) {
        // Find edge elements and wrap around
        const activeElements = focusableElements.filter((el) => !el.disabled);
        if (activeElements.length === 0) return;

        let wrapTarget: FocusableElement | null = null;

        switch (direction) {
          case 'up':
            // Find bottom-most element
            wrapTarget = activeElements.reduce((lowest, el) =>
              el.position.y > lowest.position.y ? el : lowest
            );
            break;
          case 'down':
            // Find top-most element
            wrapTarget = activeElements.reduce((highest, el) =>
              el.position.y < highest.position.y ? el : highest
            );
            break;
          case 'left':
            // Find right-most element
            wrapTarget = activeElements.reduce((rightmost, el) =>
              el.position.x > rightmost.position.x ? el : rightmost
            );
            break;
          case 'right':
            // Find left-most element
            wrapTarget = activeElements.reduce((leftmost, el) =>
              el.position.x < leftmost.position.x ? el : leftmost
            );
            break;
        }

        if (wrapTarget) {
          focusElement(wrapTarget.id);
        }
      } else {
        log('No navigation target in direction:', direction);
      }
    },
    [focusableElements, focusElement, wrapAround, log]
  );

  // Handle select action
  const handleSelect = useCallback(() => {
    const currentId = currentFocusIdRef.current;
    if (!currentId) return;

    const element = focusableElements.find((el) => el.id === currentId);
    if (element && !element.disabled) {
      element.onSelect?.();
      log('Selected element:', currentId);
    }
  }, [focusableElements, log]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect();
          break;
        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          onBack?.();
          break;
        case 'x':
        case 'X':
          if (e.ctrlKey) {
            e.preventDefault();
            onExit?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, handleSelect, onBack, onExit]);

  // Recalculate navigation map when elements change
  useEffect(() => {
    calculateNavigationMap();
  }, [calculateNavigationMap]);

  // Set initial focus
  useEffect(() => {
    if (initialFocusId && !currentFocusIdRef.current) {
      focusElement(initialFocusId);
    } else if (!currentFocusIdRef.current && focusableElements.length > 0) {
      const firstEnabled = focusableElements.find((el) => !el.disabled);
      if (firstEnabled) {
        focusElement(firstEnabled.id);
      }
    }
  }, [initialFocusId, focusElement, focusableElements]);

  return {
    currentFocusId: currentFocusIdRef.current,
    focusElement,
    navigate,
    handleSelect,
  };
}
