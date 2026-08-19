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
    { id: 3, distanceStr: '14.5 km', distanceMeters: 14500, roadName: 'City Centre Mirdif', instruction: 'City Centre Mirdif reached', type: 'destination', modifier: 'destination', location: [55.4077, 25.2155] },
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
            <button
              key={step.id || idx}
              type="button"
              onClick={() => inspectStep(step)}
              className={`w-full text-left flex items-start space-x-3.5 p-2 rounded-2xl transition-all duration-150 group ${
                isSelected
                  ? 'bg-sky-500/15 border border-sky-500/40 shadow-lg'
                  : step.isWaypointStop
                  ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              {/* Maneuver Arrow or Waypoint Arrival Flag Icon */}
              <div className="pt-0.5 flex-shrink-0">
                {step.isWaypointStop ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold">
                    <Flag className="w-3 h-3 fill-black" />
                  </div>
                ) : (
                  <ManeuverIcon
                    type={step.type}
                    modifier={step.modifier}
                    size="md"
                    className={isSelected ? 'text-sky-300' : 'text-white/80 group-hover:text-white'}
                  />
                )}
              </div>

              {/* Step Instruction & Distance */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-xs font-bold font-sf-display tabular-nums tracking-tight leading-snug ${
                      step.isWaypointStop ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    In {step.distanceStr}
                  </span>
                  {step.isWaypointStop && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[9px] font-bold text-amber-300 uppercase">
                      Stop Reached
                    </span>
                  )}
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
                <span
                  className={`text-xs font-medium leading-snug mt-0.5 line-clamp-2 ${
                    step.isWaypointStop ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
                  }`}
                >
                  {step.instruction}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </LiquidGlassCard>
  );
};
