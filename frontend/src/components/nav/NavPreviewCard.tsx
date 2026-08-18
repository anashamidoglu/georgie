import React from 'react';
import { CornerUpRight, CornerUpLeft, ArrowUp, RotateCcw } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';

export const NavPreviewCard: React.FC = () => {
  const { primaryManeuver } = useNav();

  const distance = primaryManeuver?.distanceStr || '1.5 km';
  const roadName = primaryManeuver?.instruction || primaryManeuver?.roadName || 'Bear Valley Rd';
  const modifier = primaryManeuver?.modifier?.toLowerCase() || 'right';

  const renderIcon = () => {
    if (modifier.includes('left')) {
      return <CornerUpLeft className="w-9 h-9 text-white stroke-[2.5] flex-shrink-0" />;
    }
    if (modifier.includes('straight') || modifier.includes('continue')) {
      return <ArrowUp className="w-9 h-9 text-white stroke-[2.5] flex-shrink-0" />;
    }
    if (modifier.includes('uturn') || modifier.includes('u-turn')) {
      return <RotateCcw className="w-9 h-9 text-white stroke-[2.5] flex-shrink-0" />;
    }
    return <CornerUpRight className="w-9 h-9 text-white stroke-[2.5] flex-shrink-0" />;
  };

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full flex items-center select-none font-sf"
    >
      <div className="flex items-center space-x-5">
        {/* Large Dynamic Maneuver Icon */}
        {renderIcon()}

        {/* Turn Distance & Street Name */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
            {distance}
          </span>
          <span className="text-sm font-semibold text-white/85 tracking-normal mt-1 truncate max-w-[210px]">
            {roadName}
          </span>
        </div>
      </div>
    </LiquidGlassCard>
  );
};
