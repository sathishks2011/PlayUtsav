import { useEffect, useRef } from 'react';
type TeamNameBadgeProps = {
  name: string;
  color?: string | null;
  className?: string;
};

export function TeamNameBadge({ name, color, className }: TeamNameBadgeProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const fallback = 'var(--color-accent)';
    ref.current.style.setProperty('--team-name-color', color ?? fallback);
  }, [color]);

  return <span ref={ref} className={`team-name-badge${className ? ` ${className}` : ''}`}>{name}</span>;
}
