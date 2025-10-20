import React, { createContext, useContext, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'neutral';

type Toast = {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastContextValue = {
  showToast: (toast: { message: string; type?: ToastType; duration?: number; action?: { label: string; onClick: () => void } }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'neutral', duration = 4500, action }: { message: string; type?: ToastType; duration?: number; action?: { label: string; onClick: () => void } }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [...t, { id, message, type, duration, action }]);
    // Auto remove after duration + small buffer
    setTimeout(() => removeToast(id), duration + 120);
  }, [removeToast]);

  // Expose a simple global API for legacy components that haven't imported the hook
  React.useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win) {
      const previous = win.__APP_TOAST__;
      win.__APP_TOAST__ = { showToast };
      return () => {
        // restore previous if any
        if (previous === undefined) {
          delete win.__APP_TOAST__;
        } else {
          win.__APP_TOAST__ = previous;
        }
      };
    }
    return;
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* global helper for legacy components is set in useEffect */}
      {ReactDOM.createPortal(
        <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              aria-atomic="true"
        className={`w-full rounded-lg shadow-xl p-3 text-sm text-white flex items-start gap-3 transform transition-all duration-200 ease-out animate-toast-enter`
          + ` ${toast.type === 'success' ? 'bg-emerald-600/95' : toast.type === 'error' ? 'bg-rose-600/95' : toast.type === 'info' ? 'bg-sky-600/95' : 'bg-[color:var(--card)]/95 border border-[var(--fg)]/10'}`}
            >
              <div className="flex-1">
                <div className="font-semibold text-xs opacity-90 mb-1">{toast.type?.toUpperCase()}</div>
                <div className="text-sm leading-tight">{toast.message}</div>
                {toast.action && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        try { toast.action?.onClick(); } catch (e) { console.error('toast action failed', e); }
                        removeToast(toast.id);
                      }}
                      className="text-sm px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/90"
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
              </div>
              <button
                aria-label="dismiss"
                onClick={() => removeToast(toast.id)}
                className="text-white/70 hover:text-white ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
