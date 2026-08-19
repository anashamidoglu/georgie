import React from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
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
    isVoiceMuted,
    toggleVoiceMute,
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
          {/* Distance with Highway Shield / Exit Badges & Voice Mute Button */}
          <div className="flex items-center justify-between w-full space-x-3">
            <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none flex-shrink-0">
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

              {/* 1-Tap Voice Guidance Mute / Unmute Toggle */}
              <button
                type="button"
                onClick={toggleVoiceMute}
                aria-label={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isVoiceMuted
                    ? 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                }`}
                title={isVoiceMuted ? 'Voice Guidance Muted (Click to Unmute)' : 'Voice Guidance Active (Click to Mute)'}
              >
                {isVoiceMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Full Natural Actionable Instruction Text */}
          <span className="text-sm font-semibold text-white/90 tracking-normal mt-1.5 leading-snug line-clamp-2">
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
