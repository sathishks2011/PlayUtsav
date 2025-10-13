import { useEffect, useState } from 'react';

interface UseIdleDetectorOptions {
  timeout?: number; // timeout in milliseconds
  events?: string[]; // events to listen for
  onIdle?: () => void;
  onActive?: () => void;
}

export function useIdleDetector({
  timeout = 120000, // 2 minutes default
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  onIdle,
  onActive,
}: UseIdleDetectorOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      if (isIdle) {
        setIsIdle(false);
        onActive?.();
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsIdle(true);
        onIdle?.();
      }, timeout);
    };

    // Initial timeout
    timeoutId = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, timeout);

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout, events, isIdle, onIdle, onActive]);

  return isIdle;
}
