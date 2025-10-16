import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';

interface ScoreAnimationProps {
  /** Position coordinates (scoreboard area) */
  x: number;
  y: number;
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
 * Displays a flashy star or coin that zooms in and out at the scoreboard position
 * when a player earns points. Animation focuses on the icon itself with no position movement.
 * 
 * Features:
 * - Star or coin SVG icon
 * - Zoom in/out animation at fixed position
 * - Duration: 1.5 seconds
 * - Size varies: larger for bonus points
 * - Respects animation settings (disabled if reduceMotion or !animationsEnabled)
 * 
 * Usage:
 * <ScoreAnimation
 *   x={800} y={50}
 *   points={10}
 *   isBonus={false}
 *   type="coin"
 *   onComplete={() => console.log('Animation done!')}
 * />
 */
export const ScoreAnimation: React.FC<ScoreAnimationProps> = ({
  x,
  y,
  points,
  isBonus = false,
  type = 'coin',
  onComplete,
}) => {
  const { animationsEnabled, reduceMotion } = useAppSelector(
    (state) => state.settings.animations
  );

  const [isVisible, setIsVisible] = useState(true);

  // Fixed duration for zoom in/out animation
  const duration = 1.5; // 1.5 seconds

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

  return (
    <div
      className="score-animation-container"
      style={{
        position: 'fixed',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 9999,
      } as React.CSSProperties}
    >
      <div className="score-animation-icon">
        {type === 'coin' ? (
          <CoinIcon size={size} isBonus={isBonus} />
        ) : (
          <StarIcon size={size} isBonus={isBonus} />
        )}
      </div>

      <style>{`
        @keyframes zoomInOut {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1.5);
            opacity: 1;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
          80% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 4px currentColor);
          }
          50% {
            filter: brightness(1.8) drop-shadow(0 0 16px currentColor);
          }
        }

        .score-animation-container {
          will-change: transform, opacity;
        }

        .score-animation-icon {
          width: 100%;
          height: 100%;
          animation: zoomInOut ${duration}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     glow ${duration * 0.4}s ease-in-out infinite;
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
