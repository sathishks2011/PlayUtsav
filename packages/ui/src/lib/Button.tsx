import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export const Button: React.FC<Props> = ({ variant = 'primary', className = '', ...props }) => (
  <button
    className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
      variant === 'primary' ? 'bg-[var(--color-primary)] text-white' : 'bg-transparent border border-white/30'
    } ${className}`}
    {...props}
  />
);

