import React from 'react';
import {
  Maximize2,
  Minimize2,
  Navigation,
  Play,
  X,
  Search,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { MapboxCanvas } from './MapboxCanvas';
import { LaneGuidance } from './LaneGuidance';
import { ManeuverIcon } from './ManeuverIcon';
import { RoadShield, ExitShield } from './RoadShield';
import { GoogleMapsSearchCard } from './GoogleMapsSearchCard';
import { useNav } from '../../context/NavContext';

export const NavDockedViewport: React.FC = () => {
  const {
    isNavExpanded,
    setIsNavExpanded,
    isSearchOpen,
    setIsSearchOpen,
    setIsAddStopMode,
    navStatus,
    destinationName,
    waypoints,
    eta,
    primaryManeuver,
    inspectedStep,
    allSteps,
    activeRoute,
    startNavigation,
    endNavigation,
    recenterMap,
    isRerouting,
    isVoiceMuted,
    toggleVoiceMute,
    isStreetViewOpen,
    closeStreetView,
    nextInspectedStep,
    prevInspectedStep,
  } = useNav();

  const trafficColorClass = activeRoute?.traffic?.colorClass || 'text-emerald-400';

  // Active step for HUD turn banner and step indicator
  const currentStep = inspectedStep || primaryManeuver || allSteps[0];
  const stepIdx = currentStep ? allSteps.findIndex((s) => s.id === currentStep.id) : 0;

  return (
    <div
      className="w-full h-full relative rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#090a0f] flex flex-col select-none"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (Always Live) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none z-20">
        {/* Left Section: Turn Banner (when Street View active OR expanded nav) / Rerouting Pill / Search Button */}
        <div className="flex flex-col space-y-2.5 max-w-[460px]">
          {/* Dynamic Off-Route Rerouting Status Badge */}
          {isRerouting && (
            <div className="pointer-events-auto inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-black/95 border border-white/20 text-white font-bold text-sm shadow-2xl backdrop-blur-md animate-in fade-in duration-200 font-sf select-none">
              <RotateCcw className="w-4 h-4 animate-spin text-white" />
              <span>Rerouting...</span>
            </div>
          )}

          {/* Turn Banner (shown in Street View mode OR Expanded Navigation mode) */}
          {(isStreetViewOpen || (isNavExpanded && navStatus === 'navigating')) && currentStep ? (
            <div 
              className="pointer-events-auto px-5 py-3.5 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col space-y-2 font-sf select-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3.5">
                <div className="flex-shrink-0 pt-0.5">
                  <ManeuverIcon
                    type={currentStep.type}
                    modifier={currentStep.modifier}
                    instruction={currentStep.instruction}
                    size="lg"
                    className="text-white"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between w-full space-x-3">
                    <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none flex-shrink-0">
                      {currentStep.distanceStr || '500 m'}
                    </span>
                    <div className="flex items-center space-x-2 ml-auto flex-shrink-0">
                      {currentStep.shield && (
                        <RoadShield code={currentStep.shield} size="sm" />
                      )}
                      {currentStep.exitNumber && (
                        <ExitShield exitNumber={currentStep.exitNumber} size="sm" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white/95 mt-1 leading-snug line-clamp-2">
                    {currentStep.instruction}
                  </span>
                </div>
              </div>

              {/* Embedded Full-Width Lane Strip if available */}
              {currentStep.lanes && currentStep.lanes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 w-full">
                  <LaneGuidance lanes={currentStep.lanes} size="sm" />
                </div>
              )}
            </div>
          ) : !isStreetViewOpen && (navStatus === 'idle' || isNavExpanded) ? (
            /* Scaled-Up Floating Search Trigger Button (Available in Idle and Expanded Nav) */
            <button
              type="button"
              onClick={() => {
                setIsAddStopMode(false);
                setIsSearchOpen(true);
              }}
              className="pointer-events-auto glass-btn w-13 h-13 sm:w-14 sm:h-14 text-white hover:text-white flex items-center justify-center transition-all shadow-2xl active:scale-90"
              aria-label="Search destination"
              title="Search destination"
            >
              <Search className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white" />
            </button>
          ) : null}
        </div>

        {/* Right Section: Controls (Hidden during Street View mode) */}
        {!isStreetViewOpen && (
          <div 
            className="flex flex-col space-y-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Top Button Group: Recenter & Expand/Collapse Toggle */}
            <div className="flex items-center space-x-3">
              {/* Recenter Location Button */}
              <button
                type="button"
                onClick={recenterMap}
                className="glass-btn w-13 h-13 sm:w-14 sm:h-14 text-white hover:text-white flex items-center justify-center transition-all shadow-2xl active:scale-90"
                aria-label="Recenter Location"
                title="Recenter Location"
              >
                <Navigation className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
              </button>

              {/* Expand / Collapse Button */}
              <button
                type="button"
                onClick={() => setIsNavExpanded(!isNavExpanded)}
                className="glass-btn w-13 h-13 sm:w-14 sm:h-14 text-white hover:text-white flex items-center justify-center transition-all shadow-2xl active:scale-90"
                aria-label={isNavExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
                title={isNavExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
              >
                {isNavExpanded ? (
                  <Minimize2 className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
                ) : (
                  <Maximize2 className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
                )}
              </button>
            </div>

            {/* Voice Guidance Mute / Unmute Button */}
            {navStatus === 'navigating' && (
              <button
                type="button"
                onClick={toggleVoiceMute}
                className={`glass-btn w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center transition-all shadow-2xl active:scale-90 ${
                  isVoiceMuted
                    ? 'text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                    : 'text-sky-300 border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25'
                }`}
                aria-label={isVoiceMuted ? 'Unmute Voice Guidance' : 'Mute Voice Guidance'}
                title={isVoiceMuted ? 'Voice Guidance Muted' : 'Voice Guidance Active'}
              >
                {isVoiceMuted ? (
                  <VolumeX className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white/50" />
                ) : (
                  <Volume2 className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-sky-300" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Floating Controls (Street View Step Controls OR Navigation ETA Banner) */}
      {isStreetViewOpen ? (
        /* Street View Bottom Bar: < Prev, Step X of Y, Next >, Back to Map */
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col items-center space-y-2 pointer-events-none z-30">
          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-5 py-2.5 flex items-center justify-between font-sf select-none w-full max-w-[520px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Step Switcher Controls */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={prevInspectedStep}
                disabled={stepIdx <= 0}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition-all active:scale-90 border border-white/15"
                title="Previous step"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={nextInspectedStep}
                disabled={stepIdx >= allSteps.length - 1}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition-all active:scale-90 border border-white/15"
                title="Next step"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="flex flex-col ml-2">
                <span className="text-xs font-bold text-sky-400 font-sf tabular-nums">
                  Step {stepIdx + 1} of {allSteps.length}
                </span>
                <span className="text-[11px] text-white/50 truncate max-w-[200px] font-medium">
                  {currentStep?.instruction || 'Maneuver point'}
                </span>
              </div>
            </div>

            {/* Back to Map / Exit Street View Button */}
            <button
              type="button"
              onClick={closeStreetView}
              className="h-10 px-4 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xl transition-all active:scale-95 border border-sky-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Map</span>
            </button>
          </div>
        </div>
      ) : (navStatus === 'preview' || navStatus === 'navigating') ? (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col items-center space-y-2 pointer-events-none z-30">
          {/* Multi-Stop Action Strip (in preview mode) */}
          {navStatus === 'preview' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddStopMode(true);
                  setIsSearchOpen(true);
                }}
                className="pointer-events-auto rounded-full bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-4 py-2 flex items-center space-x-2 text-sm font-bold text-white/90 hover:text-white hover:border-white/40 transition-all font-sf active:scale-95"
                title="Add a stop along route"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Add Stop</span>
              </button>
            </div>
          )}

          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-5 py-3 flex items-center justify-between font-sf select-none w-full max-w-[500px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Route Summary & Google Maps Style Traffic-Colored ETA */}
            <div className="flex flex-col min-w-0 mr-3">
              <div className="flex items-baseline space-x-2.5 whitespace-nowrap">
                <span className={`text-2xl sm:text-3xl font-bold font-sf-display tabular-nums tracking-tight ${trafficColorClass}`}>
                  {eta.duration || '0 min'}
                </span>
                <span className="text-base sm:text-lg font-bold font-sf-display text-white/80 tabular-nums">
                  {eta.distance || '0 km'}
                </span>
                <span className="text-sm sm:text-base font-bold font-sf-display text-white/50 tabular-nums">
                  {eta.arrival || '--:--'}
                </span>
              </div>
              <span className="text-xs text-white/45 truncate font-medium mt-0.5">
                {waypoints.length > 0 ? `${destinationName} (${waypoints.length + 1} stops)` : destinationName}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              {navStatus === 'preview' ? (
                <>
                  <button
                    type="button"
                    onClick={endNavigation}
                    aria-label="Cancel Route Preview"
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90"
                    title="Cancel Route"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={startNavigation}
                    aria-label="Start Turn-by-Turn Navigation"
                    className="h-11 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base flex items-center space-x-2 shadow-2xl transition-all active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    <span>Start</span>
                  </button>
                </>
              ) : (
                /* Active Navigation: Clean End Route (Red X) button */
                <button
                  type="button"
                  onClick={endNavigation}
                  aria-label="End Navigation"
                  className="w-11 h-11 rounded-full bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-red-300 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-lg"
                  title="End Navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. Google Maps Search & POI Overlay Modal */}
      <GoogleMapsSearchCard
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
