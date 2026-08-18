import React from 'react';
import type { LaneInfo } from '../../services/navService';

interface LaneGuidanceProps {
  lanes?: LaneInfo[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LaneGuidance: React.FC<LaneGuidanceProps> = ({
  lanes,
  className = '',
  size = 'md',
}) => {
  if (!lanes || lanes.length === 0) return null;

  const iconDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const renderLaneGlyph = (directions: string[], active: boolean) => {
    const dList = directions.map((d) => d.toLowerCase());
    const isStraight = dList.some((d) => d.includes('straight') || d.includes('through'));
    const isLeft = dList.some((d) => d.includes('left'));
    const isRight = dList.some((d) => d.includes('right'));
    const isUturn = dList.some((d) => d.includes('uturn') || d.includes('u-turn'));

    const strokeColor = active ? '#ffffff' : 'rgba(255, 255, 255, 0.28)';
    const strokeWidth = active ? '2.4' : '2.0';

    // 1. Dual Indication: Straight + Right
    if (isStraight && isRight) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M12 21V5M12 5L8 9M12 5L16 9" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 14H17C18.6569 14 20 12.6569 20 11V7M20 7L17 10M20 7L23 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 2. Dual Indication: Straight + Left
    if (isStraight && isLeft) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M12 21V5M12 5L8 9M12 5L16 9" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 14H7C5.34315 14 4 12.6569 4 11V7M4 7L1 10M4 7L7 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 3. Left Turn
    if (isLeft) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M18 20V12C18 9.79086 16.2091 8 14 8H6M6 8L10 4M6 8L10 12" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 4. Right Turn
    if (isRight) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M6 20V12C6 9.79086 7.79086 8 10 8H18M18 8L14 4M18 8L14 12" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 5. U-Turn
    if (isUturn) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M18 20V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V20M6 20L3 17M6 20L9 17" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 6. Straight / Default
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
        <path d="M12 21V5M12 5L7 10M12 5L17 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div
      className={`inline-flex items-center space-x-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 ${className}`}
      title="Lane Guidance"
    >
      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-center p-0.5 transition-all ${
            lane.active
              ? 'opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
              : lane.valid === false
              ? 'opacity-20 line-through'
              : 'opacity-40'
          }`}
        >
          {renderLaneGlyph(lane.directions, lane.active)}
        </div>
      ))}
    </div>
  );
};
