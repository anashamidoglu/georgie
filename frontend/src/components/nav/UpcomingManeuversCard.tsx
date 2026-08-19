import React from 'react';
import { Flag } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { ManeuverIcon } from './ManeuverIcon';
import { RoadShield, ExitShield } from './RoadShield';
import { useNav } from '../../context/NavContext';

export const UpcomingManeuversCard: React.FC = () => {
  const { upcomingSteps, inspectStep, inspectedStep } = useNav();

  return (
    <LiquidGlassCard
      padding="md"
      className="w-full h-full min-h-0 max-h-full flex flex-col overflow-hidden select-none font-sf"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 px-1 flex-shrink-0">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider font-sf">
          Upcoming Steps
        </span>
        <span className="text-xs font-bold text-white/40 font-sf tabular-nums">
          {upcomingSteps.length} {upcomingSteps.length === 1 ? 'step' : 'steps'}
        </span>
      </div>

      {/* Scrollable list of interactive steps */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
        {upcomingSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-white/40">
            <span className="text-sm font-semibold text-white/70">
              Approaching Final Destination
            </span>
            <span className="text-xs text-white/40 mt-1">
              Follow current maneuver to complete route
            </span>
          </div>
        ) : (
          upcomingSteps.map((step, idx) => {
            const isSelected = inspectedStep?.id === step.id;

            return (
              <button
                key={step.id ?? idx}
                type="button"
                onClick={() => inspectStep(step)}
                className={`w-full text-left flex items-start space-x-4 p-2.5 rounded-2xl transition-all duration-150 group ${
                  isSelected
                    ? 'bg-sky-500/20 border border-sky-500/50 shadow-xl scale-[1.01]'
                    : step.isWaypointStop
                    ? 'bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08]'
                }`}
              >
                {/* Maneuver Arrow or Waypoint Arrival Flag Icon */}
                <div className="pt-0.5 flex-shrink-0">
                  {step.isWaypointStop ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold">
                      <Flag className="w-4 h-4 fill-black" />
                    </div>
                  ) : (
                    <ManeuverIcon
                      type={step.type}
                      modifier={step.modifier}
                      instruction={step.instruction}
                      size="lg"
                      className={isSelected ? 'text-sky-300' : 'text-white group-hover:text-white'}
                    />
                  )}
                </div>

                {/* Step Instruction & Distance */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between w-full space-x-2">
                    <span
                      className={`text-sm font-bold font-sf-display tabular-nums tracking-tight leading-snug flex-shrink-0 ${
                        step.isWaypointStop ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      In {step.distanceStr}
                    </span>
                    {step.isWaypointStop && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                        Stop Reached
                      </span>
                    )}
                    <div className="flex items-center space-x-2 ml-auto flex-shrink-0">
                      {step.shield && (
                        <RoadShield code={step.shield} size="md" />
                      )}
                      {step.exitNumber && (
                        <ExitShield exitNumber={step.exitNumber} size="md" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold leading-snug mt-1 line-clamp-2 ${
                      step.isWaypointStop ? 'text-white font-bold' : 'text-white/90 group-hover:text-white'
                    }`}
                  >
                    {step.instruction}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </LiquidGlassCard>
  );
};
