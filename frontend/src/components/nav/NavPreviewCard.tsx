import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { LaneGuidance } from './LaneGuidance';
import { ManeuverIcon } from './ManeuverIcon';
import { useNav } from '../../context/NavContext';

export const NavPreviewCard: React.FC = () => {
  const { primaryManeuver, inspectedStep, clearInspectedStep } = useNav();

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
      {/* Inspected Step Header with Back Button */}
      {inspectedStep && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-sf">
            Step {inspectedStep.id + 1} Preview
          </span>
          <button
            type="button"
            onClick={clearInspectedStep}
            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
        </div>
      )}

      <div className="flex items-start space-x-4">
        {/* Natural Google-Style Maneuver Arrow Glyph */}
        <div className="flex-shrink-0 pt-0.5">
          <ManeuverIcon
            type={currentStep?.type}
            modifier={currentStep?.modifier}
            size="lg"
            className="text-white"
          />
        </div>

        {/* Turn Distance & Natural Google-Style Instruction Text */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Distance with Highway Shield / Exit Badges */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
              {distance}
            </span>

            {/* Road Shield Badge (e.g. E11, D71, E311) */}
            {shield && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 tracking-wider uppercase">
                {shield}
              </span>
            )}

            {/* Highway Exit Badge (e.g. Exit 50, Exit 29) */}
            {exitNumber && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 tracking-wider uppercase">
                {exitNumber}
              </span>
            )}
          </div>

          {/* Full Natural Actionable Instruction Text */}
          <span className="text-sm font-semibold text-white/90 tracking-normal mt-1 leading-snug line-clamp-2">
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
