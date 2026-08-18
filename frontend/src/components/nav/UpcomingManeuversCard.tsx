import React from 'react';
import { ArrowUp, CornerUpRight, CornerUpLeft, MapPin, RotateCcw } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';

export const UpcomingManeuversCard: React.FC = () => {
  const { upcomingSteps } = useNav();

  const fallbackSteps = [
    { distanceStr: '4.2 km', roadName: 'Main Highway', instruction: 'Continue on Main Highway', type: 'straight', modifier: 'straight' },
    { distanceStr: '11.8 km', roadName: 'Financial Centre Exit', instruction: 'Take Exit 29', type: 'turn', modifier: 'right' },
    { distanceStr: '14.5 km', roadName: 'Destination', instruction: 'Arrive at destination', type: 'destination', modifier: 'destination' },
  ];

  const stepsToDisplay = upcomingSteps.length > 0 ? upcomingSteps : fallbackSteps;

  const renderIcon = (modifier?: string, type?: string) => {
    const mod = modifier?.toLowerCase() || '';
    if (type === 'destination' || mod.includes('dest')) {
      return <MapPin className="w-5 h-5 text-emerald-400 stroke-[2.2] flex-shrink-0" />;
    }
    if (mod.includes('left')) {
      return <CornerUpLeft className="w-5 h-5 text-white/90 stroke-[2.2] flex-shrink-0" />;
    }
    if (mod.includes('uturn') || mod.includes('u-turn')) {
      return <RotateCcw className="w-5 h-5 text-white/90 stroke-[2.2] flex-shrink-0" />;
    }
    if (mod.includes('right')) {
      return <CornerUpRight className="w-5 h-5 text-white/90 stroke-[2.2] flex-shrink-0" />;
    }
    return <ArrowUp className="w-5 h-5 text-white/90 stroke-[2.2] flex-shrink-0" />;
  };

  return (
    <LiquidGlassCard
      padding="md"
      className="w-full h-full min-h-0 max-h-full flex flex-col overflow-hidden select-none font-sf"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 px-1 flex-shrink-0">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider font-sf">
          Upcoming Maneuvers
        </span>
        <span className="text-[10px] font-medium text-white/30 font-sf tabular-nums">
          {stepsToDisplay.length} steps
        </span>
      </div>

      {/* Scrollable list of maneuvers with strict min-h-0 to avoid CSS grid blowout */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-1.5 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {stepsToDisplay.map((step, idx) => (
          <div key={idx} className="flex items-center space-x-3.5 px-1 py-0.5 group">
            {/* Free-floating Arrow Icon (No Box) */}
            {renderIcon(step.modifier, step.type)}

            {/* Instruction and Distance Details */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold font-sf-display tabular-nums text-white tracking-tight leading-snug">
                In {step.distanceStr}
              </span>
              <span className="text-[11px] font-medium text-white/70 truncate mt-0.5">
                {step.instruction || step.roadName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </LiquidGlassCard>
  );
};
