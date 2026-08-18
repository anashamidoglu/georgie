import React from 'react';
import { CornerUpRight, CornerUpLeft, ArrowUp, RotateCcw } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { LaneGuidance } from './LaneGuidance';
import { useNav } from '../../context/NavContext';

export const NavPreviewCard: React.FC = () => {
  const { primaryManeuver } = useNav();

  const distance = primaryManeuver?.distanceStr || '1.5 km';
  const roadName = primaryManeuver?.instruction || primaryManeuver?.roadName || 'Bear Valley Rd';
  const modifier = primaryManeuver?.modifier?.toLowerCase() || 'right';
  const lanes = primaryManeuver?.lanes;
  const shield = primaryManeuver?.shield;
  const exitNumber = primaryManeuver?.exitNumber;

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
      className="w-full flex flex-col justify-center select-none font-sf relative overflow-hidden"
    >
      <div className="flex items-center space-x-4">
        {/* Large Dynamic Maneuver Icon */}
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>

        {/* Turn Distance & Street Details */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Distance with Highway Shield / Exit Badges */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
              {distance}
            </span>

            {/* Road Shield Badge (e.g. E11, D71) */}
            {shield && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 tracking-wider uppercase">
                {shield}
              </span>
            )}

            {/* Highway Exit Badge (e.g. Exit 50) */}
            {exitNumber && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider uppercase">
                {exitNumber}
              </span>
            )}
          </div>

          {/* Road / Maneuver Name */}
          <span className="text-sm font-semibold text-white/85 tracking-normal mt-1 truncate max-w-[220px]">
            {roadName}
          </span>
        </div>
      </div>

      {/* Embedded Lane Guidance Strip if available on current step */}
      {lanes && lanes.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-sf">
            Lane Guidance
          </span>
          <LaneGuidance lanes={lanes} size="sm" />
        </div>
      )}
    </LiquidGlassCard>
  );
};
