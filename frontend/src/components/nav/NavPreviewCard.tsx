import React from 'react';
import { CornerUpRight } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';

interface NavPreviewCardProps {
  distance?: string;
  roadName?: string;
  maneuver?: string;
}

export const NavPreviewCard: React.FC<NavPreviewCardProps> = ({
  distance = '1.5 km',
  roadName = 'Bear Valley Rd',
}) => {
  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full flex items-center select-none font-sf"
    >
      <div className="flex items-center space-x-5">
        {/* Large Clean Maneuver Arrow (Directly on card, no nested box - Luce style) */}
        <CornerUpRight
          className="w-9 h-9 text-white stroke-[2.5] flex-shrink-0"
        />

        {/* Turn Distance & Street Name */}
        <div className="flex flex-col justify-center">
          <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
            {distance}
          </span>
          <span className="text-sm font-medium text-white/70 tracking-normal mt-1 truncate max-w-[210px]">
            {roadName}
          </span>
        </div>
      </div>
    </LiquidGlassCard>
  );
};
