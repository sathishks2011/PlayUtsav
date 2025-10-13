import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';

interface ScoreAnimationProps {
  /** Starting coordinates (e.g., answer button position) */
  startX: number;
  startY: number;
  /** Target coordinates (e.g., scoreboard position) */
  targetX: number;
  targetY: number;
  /** Points earned (affects animation size/duration) */
  points: number;
  /** Whether this is a bonus/special score */
  isBonus?: boolean;
  /** Animation type */
  type?: 'star' | 'coin';
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * ScoreAnimation Component
 * 
 * Displays a flashy star or coin that flies from the answer area to the scoreboard
 * when a player selects a correct answer. Animation duration and size vary based on
 * points earned.
 * 
 * Features:
 * - Star or coin SVG icon
 * - Flies from startX/startY to targetX/targetY
 * - Duration: 2-4 seconds based on distance and points
 * - Size varies: larger for bonus points
 * - Respects animation settings (disabled if reduceMotion or !animationsEnabled)
 * 
 * Usage:
 * <ScoreAnimation
 *   startX={100} startY={200}
 *   targetX={800} targetY={50}
 *   points={10}
 *   isBonus={false}
 *   type="coin"
 *   onComplete={() => console.log('Animation done!')}
 * />
 */
export const ScoreAnimation: React.FC<ScoreAnimationProps> = ({
  startX,
  startY,
  targetX,
  targetY,
  points,
  isBonus = false,
  type = 'coin',
  onComplete,
}) => {
  const { animationsEnabled, reduceMotion } = useAppSelector(
    (state) => state.settings.animations
  );

  const [isVisible, setIsVisible] = useState(true);

  // Determine animation duration based on distance and points
  const distance = Math.sqrt(
    Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
  );
  const baseDuration = Math.min(Math.max(distance / 500, 2), 4); // 2-4 seconds
  const duration = isBonus ? baseDuration * 1.2 : baseDuration; // Bonus takes longer

  // Determine size based on points and bonus status
  const baseSize = isBonus ? 60 : 40; // Larger for bonus
  const size = Math.min(baseSize + points * 2, 100); // Scale with points, max 100px

  useEffect(() => {
    // If animations disabled or reduce motion, skip animation and complete immediately
    if (!animationsEnabled || reduceMotion) {
      onComplete?.();
      return;
    }

    // Auto-hide after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [animationsEnabled, reduceMotion, duration, onComplete]);

  // Don't render if animations disabled or reduce motion enabled
  if (!animationsEnabled || reduceMotion || !isVisible) {
    return null;
  }

  // Calculate animation path
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  return (
    <div
      className="score-animation-container"
      style={{
        position: 'fixed',
        left: startX,
        top: startY,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 9999,
        animation: `fly ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards, pulse ${duration * 0.5}s ease-in-out infinite`,
        '--delta-x': `${deltaX}px`,
        '--delta-y': `${deltaY}px`,
      } as React.CSSProperties}
    >
      {type === 'coin' ? (
        <CoinIcon size={size} isBonus={isBonus} />
      ) : (
        <StarIcon size={size} isBonus={isBonus} />
      )}

      <style>{`
        @keyframes fly {
          0% {
            transform: translate(0, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translate(0, 0) scale(1.2) rotate(0deg);
          }
          90% {
            opacity: 1;
            transform: translate(var(--delta-x), var(--delta-y)) scale(1) rotate(720deg);
          }
          100% {
            transform: translate(var(--delta-x), var(--delta-y)) scale(0.3) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.5) drop-shadow(0 0 8px currentColor);
          }
        }

        .score-animation-container {
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
};

interface IconProps {
  size: number;
  isBonus: boolean;
}

const CoinIcon: React.FC<IconProps> = ({ size, isBonus }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="50"
      cy="50"
      r="45"
      fill={isBonus ? '#FFD700' : '#FFA500'}
      stroke={isBonus ? '#FF8C00' : '#FF6347'}
      strokeWidth="3"
    />
    <circle
      cx="50"
      cy="50"
      r="35"
      fill={isBonus ? '#FFF4CC' : '#FFE4B5'}
      opacity="0.6"
    />
    <text
      x="50"
      y="60"
      textAnchor="middle"
      fill={isBonus ? '#FF8C00' : '#8B4513'}
      fontSize="40"
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      $
    </text>
  </svg>
);

const StarIcon: React.FC<IconProps> = ({ size, isBonus }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isBonus ? '#FFD700' : '#FFA500'} />
        <stop offset="100%" stopColor={isBonus ? '#FF8C00' : '#FF6347'} />
      </linearGradient>
    </defs>
    <path
      d="M50 5 L61 38 L95 38 L68 58 L79 91 L50 71 L21 91 L32 58 L5 38 L39 38 Z"
      fill="url(#starGradient)"
      stroke={isBonus ? '#FF8C00' : '#FF6347'}
      strokeWidth="2"
    />
    <path
      d="M50 15 L58 40 L82 40 L63 54 L71 79 L50 65 L29 79 L37 54 L18 40 L42 40 Z"
      fill={isBonus ? '#FFF4CC' : '#FFE4B5'}
      opacity="0.7"
    />
  </svg>
);
