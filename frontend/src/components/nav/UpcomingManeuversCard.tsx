import React from 'react';
import { Flag } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { ManeuverIcon } from './ManeuverIcon';
import { useNav } from '../../context/NavContext';
import type { ManeuverInfo } from '../../services/navService';

export const UpcomingManeuversCard: React.FC = () => {
  const { upcomingSteps, inspectStep, inspectedStep } = useNav();

  const fallbackSteps: ManeuverInfo[] = [
    { id: 1, distanceStr: '4.2 km', distanceMeters: 4200, roadName: 'Sheikh Mohammed Bin Zayed Rd (E311)', instruction: 'Continue onto Sheikh Mohammed Bin Zayed Rd (E311)', type: 'straight', modifier: 'straight', shield: 'E311', location: [55.42, 25.32] },
    { id: 2, distanceStr: '11.8 km', distanceMeters: 11800, roadName: 'Tripoli St / D83', instruction: 'Take Exit 50 for Tripoli St / D83 toward Mirdif', type: 'off ramp', modifier: 'slight right', exitNumber: 'Exit 50', shield: 'D83', location: [55.41, 25.23] },
    { id: 3, distanceStr: '14.5 km', distanceMeters: 14500, roadName: 'City Centre Mirdif', instruction: 'Arrive at City Centre Mirdif on the right', type: 'destination', modifier: 'destination', location: [55.4077, 25.2155] },
  ];

  const stepsToDisplay = upcomingSteps.length > 0 ? upcomingSteps : fallbackSteps;

  return (
    <LiquidGlassCard
      padding="md"
      className="w-full h-full min-h-0 max-h-full flex flex-col overflow-hidden select-none font-sf"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 px-1 flex-shrink-0">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider font-sf">
          Upcoming Steps
        </span>
        <span className="text-[10px] font-medium text-white/30 font-sf tabular-nums">
          {stepsToDisplay.length} steps
        </span>
      </div>

      {/* Scrollable list of interactive steps */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-1.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {stepsToDisplay.map((step, idx) => {
          const isSelected = inspectedStep?.id === step.id;

          return (
            <React.Fragment key={step.id || idx}>
              <button
                type="button"
                onClick={() => inspectStep(step)}
                className={`w-full text-left flex items-start space-x-3.5 p-2 rounded-2xl transition-all duration-150 group ${
                  isSelected
                    ? 'bg-sky-500/15 border border-sky-500/40 shadow-lg'
                    : 'hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                {/* Natural Google-Style Maneuver Arrow Glyph */}
                <div className="pt-0.5 flex-shrink-0">
                  <ManeuverIcon
                    type={step.type}
                    modifier={step.modifier}
                    size="md"
                    className={isSelected ? 'text-sky-300' : 'text-white/80 group-hover:text-white'}
                  />
                </div>

                {/* Natural Google Maps-Style Instruction & Distance */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold font-sf-display tabular-nums text-white tracking-tight leading-snug">
                      In {step.distanceStr}
                    </span>
                    {step.shield && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 uppercase">
                        {step.shield}
                      </span>
                    )}
                    {step.exitNumber && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 uppercase">
                        {step.exitNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-white/80 leading-snug mt-0.5 group-hover:text-white line-clamp-2">
                    {step.instruction}
                  </span>
                </div>
              </button>

              {/* Next Stop Milestone Divider */}
              {step.isWaypointStop && (
                <div className="my-2 px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center space-x-2.5 shadow-md">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center flex-shrink-0 font-bold">
                    <Flag className="w-3.5 h-3.5 fill-black" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Next Stop
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {step.stopName || 'Waypoint Stop'}
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </LiquidGlassCard>
  );
};
