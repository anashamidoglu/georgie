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
    const isSlightLeft = dList.some((d) => d.includes('slight left'));
    const isSlightRight = dList.some((d) => d.includes('slight right'));
    const isLeft = dList.some((d) => d.includes('left')) && !isSlightLeft;
    const isRight = dList.some((d) => d.includes('right')) && !isSlightRight;
    const isUturn = dList.some((d) => d.includes('uturn') || d.includes('u-turn'));

    const strokeColor = active ? '#ffffff' : 'rgba(255, 255, 255, 0.28)';
    const strokeWidth = active ? '2.8' : '2.0';

    // 1. Dual Indication: Straight + Right
    if (isStraight && (isRight || isSlightRight)) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M12 21V5M12 5L8 9M12 5L16 9" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 14H17C18.6569 14 20 12.6569 20 11V7M20 7L17 10M20 7L23 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 2. Dual Indication: Straight + Left
    if (isStraight && (isLeft || isSlightLeft)) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M12 21V5M12 5L8 9M12 5L16 9" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 14H7C5.34315 14 4 12.6569 4 11V7M4 7L1 10M4 7L7 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 3. Slight Left
    if (isSlightLeft) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M15 21V13C15 10.5 13.5 8.5 11 7.5L6 5M6 5H11M6 5V10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 4. Slight Right
    if (isSlightRight) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M9 21V13C9 10.5 10.5 8.5 13 7.5L18 5M18 5H13M18 5V10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 5. Left Turn (90 deg)
    if (isLeft) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M18 20V12C18 9.79086 16.2091 8 14 8H6M6 8L10 4M6 8L10 12" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 6. Right Turn (90 deg)
    if (isRight) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M6 20V12C6 9.79086 7.79086 8 10 8H18M18 8L14 4M18 8L14 12" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 7. U-Turn
    if (isUturn) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
          <path d="M18 20V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V20M6 20L3 17M6 20L9 17" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 8. Straight / Default
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconDimensions}>
        <path d="M12 21V5M12 5L7 10M12 5L17 10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div
      className={`w-full flex items-center justify-between gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg ${className}`}
      title="Lane Guidance"
    >
      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className={`flex-1 flex items-center justify-center py-1 rounded-xl transition-all duration-150 ${
            lane.active
              ? 'opacity-100 bg-white/[0.18] border border-white/30'
              : lane.valid === false
              ? 'opacity-15 bg-transparent'
              : 'opacity-35 bg-white/[0.04]'
          }`}
        >
          {renderLaneGlyph(lane.directions, lane.active)}
        </div>
      ))}
    </div>
  );
};
