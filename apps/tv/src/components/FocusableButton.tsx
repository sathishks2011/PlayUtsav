import { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

export interface FocusableButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  focusId: string;
  onFocusChange?: (focused: boolean) => void;
  focusClassName?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * A button component optimized for TV remote navigation
 * Automatically handles focus states and provides clear visual feedback
 */
export const FocusableButton = forwardRef<HTMLButtonElement, FocusableButtonProps>(
  (
    {
      focusId,
      onFocusChange,
      focusClassName,
      variant = 'primary',
      size = 'lg',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const button = buttonRef.current;
      if (!button) return;

      const handleFocus = () => {
        setIsFocused(true);
        onFocusChange?.(true);
      };

      const handleBlur = () => {
        setIsFocused(false);
        onFocusChange?.(false);
      };

      button.addEventListener('focus', handleFocus);
      button.addEventListener('blur', handleBlur);

      return () => {
        button.removeEventListener('focus', handleFocus);
        button.removeEventListener('blur', handleBlur);
      };
    }, [onFocusChange]);

    // Merge refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(buttonRef.current);
        } else {
          ref.current = buttonRef.current;
        }
      }
    }, [ref]);

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline:
        'border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-base',
      md: 'px-6 py-3 text-lg',
      lg: 'px-8 py-4 text-xl',
      xl: 'px-12 py-6 text-2xl',
    };

    const focusStyles = isFocused
      ? focusClassName || 'ring-4 ring-accent ring-offset-4 ring-offset-background scale-105'
      : '';

    return (
      <button
        ref={buttonRef}
        data-focus-id={focusId}
        disabled={disabled}
        className={cn(
          'rounded-lg font-medium transition-all duration-200',
          'focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          focusStyles,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

FocusableButton.displayName = 'FocusableButton';
