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
  options: UseDPADNavigationOptions = {},
) {
  const { initialFocusId, onBack, onExit, wrapAround = false, debug = false } = options;
  const currentFocusIdRef = useRef<string | null>(initialFocusId || null);
  const navigationMapRef = useRef<NavigationMap>({});

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[DPAD Navigation]', ...args);
      }
    },
    [debug],
  );

  // Calculate spatial navigation map based on element positions
  const calculateNavigationMap = useCallback(() => {
    const map: NavigationMap = {};
    const activeElements = focusableElements
      .filter((el) => !el.disabled && el.ref.current)
      .map((el) => el) as FocusableElement[];

    activeElements.forEach((element) => {
      const { id, position } = element;
      const centerX = position.x + position.width / 2;
      const centerY = position.y + position.height / 2;

      map[id] = {};

      // Find best candidate in each direction
      (['up', 'down', 'left', 'right'] as Direction[]).forEach((direction) => {
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
              isInDirection = dy < -10;
              primaryDistance = Math.abs(dy);
              secondaryDistance = Math.abs(dx);
              break;
            case 'down':
              isInDirection = dy > 10;
              primaryDistance = Math.abs(dy);
              secondaryDistance = Math.abs(dx);
              break;
            case 'left':
              isInDirection = dx < -10;
              primaryDistance = Math.abs(dx);
              secondaryDistance = Math.abs(dy);
              break;
            case 'right':
              isInDirection = dx > 10;
              primaryDistance = Math.abs(dx);
              secondaryDistance = Math.abs(dy);
              break;
          }

          if (isInDirection) {
            const score = primaryDistance + secondaryDistance * 0.5;
            if (score < bestScore) {
              bestScore = score;
              bestCandidate = candidate;
            }
          }
        });

        if (bestCandidate) {
          const candidateId = (bestCandidate as FocusableElement).id;
          map[id][direction] = candidateId;
        }
      });
    });

    navigationMapRef.current = map;
    log('Navigation map calculated:', map);
  }, [focusableElements, log]);

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
    [focusableElements, log],
  );

  const navigate = useCallback(
    (direction: Direction) => {
      const currentId = currentFocusIdRef.current;
      if (!currentId) {
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
        const activeElements = focusableElements.filter((el) => !el.disabled) as FocusableElement[];
        if (activeElements.length === 0) return;

        let wrapTarget: FocusableElement | null = null;

        switch (direction) {
          case 'up':
            wrapTarget = activeElements.reduce((lowest, el) =>
              el.position.y > lowest.position.y ? el : lowest,
            );
            break;
          case 'down':
            wrapTarget = activeElements.reduce((highest, el) =>
              el.position.y < highest.position.y ? el : highest,
            );
            break;
          case 'left':
            wrapTarget = activeElements.reduce((rightmost, el) =>
              el.position.x > rightmost.position.x ? el : rightmost,
            );
            break;
          case 'right':
            wrapTarget = activeElements.reduce((leftmost, el) =>
              el.position.x < leftmost.position.x ? el : leftmost,
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
    [focusableElements, focusElement, wrapAround, log],
  );

  const handleSelect = useCallback(() => {
    const currentId = currentFocusIdRef.current;
    if (!currentId) return;

    const element = focusableElements.find((el) => el.id === currentId);
    if (element && !element.disabled) {
      element.onSelect?.();
      log('Selected element:', currentId);
    }
  }, [focusableElements, log]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigate('right');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleSelect();
          break;
        case 'Backspace':
        case 'Escape':
          event.preventDefault();
          onBack?.();
          break;
        case 'x':
        case 'X':
          if (event.ctrlKey) {
            event.preventDefault();
            onExit?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, handleSelect, onBack, onExit]);

  useEffect(() => {
    calculateNavigationMap();
  }, [calculateNavigationMap]);

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
