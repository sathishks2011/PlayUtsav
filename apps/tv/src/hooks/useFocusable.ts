import { useEffect, useRef } from 'react';
import { useDPADNavigationContext } from '../components/DPADNavigationProvider';

export interface UseFocusableOptions {
  id: string;
  disabled?: boolean;
  onFocus?: () => void;
  onSelect?: () => void;
}

/**
 * Hook to make an element focusable with DPAD navigation
 * Automatically registers/unregisters the element with the navigation system
 */
export function useFocusable<T extends HTMLElement = HTMLButtonElement>(
  options: UseFocusableOptions
) {
  const { registerElement } = useDPADNavigationContext();
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const cleanup = registerElement({
      id: options.id,
      ref: elementRef as React.RefObject<HTMLElement>,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      disabled: options.disabled,
      onFocus: options.onFocus,
      onSelect: options.onSelect,
    });

    return cleanup;
  }, [options.id, options.disabled, options.onFocus, options.onSelect, registerElement]);

  return elementRef;
}
