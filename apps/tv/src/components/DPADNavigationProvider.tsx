import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { FocusableElement, useDPADNavigation, UseDPADNavigationOptions } from '../hooks/useDPADNavigation';

interface DPADNavigationContextValue {
  registerElement: (element: FocusableElement) => () => void;
  currentFocusId: string | null;
  focusElement: (id: string) => boolean;
}

const DPADNavigationContext = createContext<DPADNavigationContextValue | null>(null);

export interface DPADNavigationProviderProps extends UseDPADNavigationOptions {
  children: React.ReactNode;
}

/**
 * Provider component that manages DPAD navigation for all focusable elements
 * Automatically tracks element positions and handles keyboard navigation
 */
export function DPADNavigationProvider({
  children,
  ...options
}: DPADNavigationProviderProps) {
  const elementsRef = useRef<Map<string, FocusableElement>>(new Map());
  const [elements, setElements] = React.useState<FocusableElement[]>([]);

  const { currentFocusId, focusElement } = useDPADNavigation(elements, options);

  // Update positions of all registered elements
  const updatePositions = useCallback(() => {
    const updated: FocusableElement[] = [];
    elementsRef.current.forEach((element) => {
      if (element.ref.current) {
        const rect = element.ref.current.getBoundingClientRect();
        const updatedElement: FocusableElement = {
          ...element,
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          },
        };
        updated.push(updatedElement);
      }
    });
    setElements(updated);
  }, []);

  // Register a new focusable element
  const registerElement = useCallback(
    (element: FocusableElement) => {
      elementsRef.current.set(element.id, element);
      updatePositions();

      // Return cleanup function
      return () => {
        elementsRef.current.delete(element.id);
        updatePositions();
      };
    },
    [updatePositions]
  );

  // Update positions on window resize
  useEffect(() => {
    const handleResize = () => {
      updatePositions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePositions]);

  // Initial position update
  useEffect(() => {
    // Use setTimeout to ensure elements are rendered
    const timer = setTimeout(updatePositions, 100);
    return () => clearTimeout(timer);
  }, [updatePositions]);

  const value: DPADNavigationContextValue = {
    registerElement,
    currentFocusId,
    focusElement,
  };

  return (
    <DPADNavigationContext.Provider value={value}>
      {children}
    </DPADNavigationContext.Provider>
  );
}

/**
 * Hook to access DPAD navigation context
 */
export function useDPADNavigationContext() {
  const context = useContext(DPADNavigationContext);
  if (!context) {
    throw new Error(
      'useDPADNavigationContext must be used within DPADNavigationProvider'
    );
  }
  return context;
}
