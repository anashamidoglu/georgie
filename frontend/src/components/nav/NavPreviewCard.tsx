import React from 'react';
import { ArrowLeft, Eye, Map } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { LaneGuidance } from './LaneGuidance';
import { ManeuverIcon } from './ManeuverIcon';
import { RoadShield, ExitShield } from './RoadShield';
import { useNav } from '../../context/NavContext';

export const NavPreviewCard: React.FC = () => {
  const {
    primaryManeuver,
    inspectedStep,
    clearInspectedStep,
    isStreetViewOpen,
    openStreetView,
    closeStreetView,
  } = useNav();

  // If a specific step is being inspected from the list, display that step
  const currentStep = inspectedStep || primaryManeuver;

  const distance = currentStep?.distanceStr || '1.5 km';
  const instruction = currentStep?.instruction || currentStep?.roadName || 'Continue on route';
  const lanes = currentStep?.lanes;
  const shield = currentStep?.shield;
  const exitNumber = currentStep?.exitNumber;

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full flex flex-col justify-center select-none font-sf relative overflow-hidden transition-all duration-200"
    >
      {/* Inspected Step Header with Bigger Text and Overview Button */}
      {inspectedStep && (
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
          <span className="text-xs font-bold text-sky-400 font-sf">
            Step {inspectedStep.id + 1} Preview
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={isStreetViewOpen ? closeStreetView : openStreetView}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-md border ${
                isStreetViewOpen
                  ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/15'
              }`}
            >
              {isStreetViewOpen ? <Map className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isStreetViewOpen ? 'Map' : 'St. View'}</span>
            </button>
            <button
              type="button"
              onClick={clearInspectedStep}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all active:scale-95 shadow-md border border-white/15"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start space-x-4">
        {/* Natural Google-Style Maneuver Arrow Glyph */}
        <div className="flex-shrink-0 pt-0.5">
          <ManeuverIcon
            type={currentStep?.type}
            modifier={currentStep?.modifier}
            instruction={instruction}
            size="lg"
            className="text-white"
          />
        </div>

        {/* Turn Distance & Natural Google-Style Instruction Text */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Distance with Highway Shield / Exit Badges */}
          <div className="flex items-center justify-between w-full space-x-3">
            <span className="text-3xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none flex-shrink-0">
              {distance}
            </span>

            <div className="flex items-center space-x-2 ml-auto flex-shrink-0">
              {/* Road Shield Badge (e.g. E11, D71, E311) */}
              {shield && (
                <RoadShield code={shield} size="md" />
              )}

              {/* Highway Exit Badge (e.g. Exit 50, Exit 29) */}
              {exitNumber && (
                <ExitShield exitNumber={exitNumber} size="md" />
              )}
            </div>
          </div>

          {/* Full Natural Actionable Instruction Text */}
          <span className="text-base font-semibold text-white/95 tracking-normal mt-1.5 leading-snug line-clamp-2">
            {instruction}
          </span>
        </div>
      </div>

      {/* Embedded Full-Width Lane Guidance Strip if available on current step */}
      {lanes && lanes.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-white/10 w-full">
          <LaneGuidance lanes={lanes} size="md" />
        </div>
      )}
    </LiquidGlassCard>
  );
};
