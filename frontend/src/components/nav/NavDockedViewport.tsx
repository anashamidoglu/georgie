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
    activeRoute,
    startNavigation,
    endNavigation,
    recenterMap,
    isRerouting,
    isVoiceMuted,
    toggleVoiceMute,
  } = useNav();

  const trafficColorClass = activeRoute?.traffic?.colorClass || 'text-emerald-400';

  return (
    <div
      className="w-full h-full relative rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#090a0f] flex flex-col select-none"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none z-20">
        {/* Left Section: Turn Banner / Rerouting Pill / Search Button */}
        <div className="flex flex-col space-y-2.5 max-w-[460px]">
          {/* Dynamic Off-Route Rerouting Status Badge */}
          {isRerouting && (
            <div className="pointer-events-auto inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-black/95 border border-white/20 text-white font-bold text-sm shadow-2xl backdrop-blur-md animate-in fade-in duration-200 font-sf select-none">
              <RotateCcw className="w-4 h-4 animate-spin text-white" />
              <span>Rerouting...</span>
            </div>
          )}

          {/* Active Navigation Turn Banner */}
          {isNavExpanded && navStatus === 'navigating' && primaryManeuver ? (
            <div 
              className="pointer-events-auto px-6 py-4 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col space-y-2.5 font-sf select-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 pt-0.5">
                  <ManeuverIcon
                    type={primaryManeuver.type}
                    modifier={primaryManeuver.modifier}
                    instruction={primaryManeuver.instruction}
                    size="lg"
                    className="text-white"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between w-full space-x-4">
                    <span className="text-3xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none flex-shrink-0">
                      {primaryManeuver.distanceStr}
                    </span>
                    <div className="flex items-center space-x-2.5 ml-auto flex-shrink-0">
                      {primaryManeuver.shield && (
                        <RoadShield code={primaryManeuver.shield} size="md" />
                      )}
                      {primaryManeuver.exitNumber && (
                        <ExitShield exitNumber={primaryManeuver.exitNumber} size="md" />
                      )}
                    </div>
                  </div>
                  <span className="text-base font-bold text-white/95 mt-1.5 leading-snug line-clamp-2">
                    {primaryManeuver.instruction}
                  </span>
                </div>
              </div>

              {/* Embedded Full-Width Lane Strip in Expanded Mode */}
              {primaryManeuver.lanes && primaryManeuver.lanes.length > 0 && (
                <div className="pt-2 border-t border-white/10 w-full">
                  <LaneGuidance lanes={primaryManeuver.lanes} size="md" />
                </div>
              )}
            </div>
          ) : !isSearchOpen && navStatus !== 'navigating' ? (
            /* Scaled-Up Search Button (Large Touch Target) */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddStopMode(false);
                setIsSearchOpen(true);
              }}
              className="pointer-events-auto glass-btn w-13 h-13 sm:w-14 sm:h-14 text-white hover:text-white flex items-center justify-center transition-all shadow-2xl active:scale-90"
              aria-label="Search Destinations"
              title="Search Destinations"
            >
              <Search className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </button>
          ) : (
            <div />
          )}
        </div>

        {/* Action Controls: Recenter Button, Expand Toggle, and Active Voice Mute Button */}
        <div 
          className="flex flex-col items-end space-y-3 pointer-events-auto flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Top Button Group: Recenter & Expand/Collapse Toggle */}
          <div className="flex items-center space-x-3">
            {/* Scaled-Up Recenter Location Button */}
            <button
              type="button"
              onClick={recenterMap}
              className="glass-btn w-13 h-13 sm:w-14 sm:h-14 text-white hover:text-white flex items-center justify-center transition-all shadow-2xl active:scale-90"
              aria-label="Recenter Location"
              title="Recenter Location"
            >
              <Navigation className="w-6 h-6 sm:w-6.5 sm:h-6.5" />
            </button>

            {/* Scaled-Up Expand / Collapse (Size) Button */}
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

          {/* Scaled-Up Voice Guidance Mute / Unmute Button */}
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
              title={isVoiceMuted ? 'Voice Guidance Muted (Click to Unmute)' : 'Voice Guidance Active (Click to Mute)'}
            >
              {isVoiceMuted ? (
                <VolumeX className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white/50" />
              ) : (
                <Volume2 className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-sky-300" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Bottom Floating Route Preview Card (Before Starting Driving Follow) */}
      {navStatus === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center space-y-2 pointer-events-none z-30">
          {/* Multi-Stop Action Strip */}
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

          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-4 flex items-center justify-between font-sf select-none w-full max-w-[520px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Route Summary & Google Maps Style Traffic-Colored ETA */}
            <div className="flex flex-col min-w-0 mr-4">
              <span className="text-xs text-white/50 truncate font-semibold">
                {waypoints.length > 0 ? `${destinationName} (${waypoints.length + 1} stops)` : destinationName}
              </span>
              <div className="flex items-baseline space-x-4 mt-0.5 whitespace-nowrap">
                <span className={`text-3xl font-bold font-sf-display tabular-nums tracking-tight whitespace-nowrap ${trafficColorClass}`}>
                  {eta.duration}
                </span>
                <span className="text-2xl font-bold font-sf-display text-white/90 tabular-nums whitespace-nowrap">
                  {eta.distance}
                </span>
                <span className="text-xl font-bold font-sf-display text-white/60 tabular-nums whitespace-nowrap">
                  {eta.arrival}
                </span>
              </div>
            </div>

            {/* Cancel & Start Navigation Action Buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={endNavigation}
                aria-label="Cancel Route Preview"
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90"
                title="Cancel Route"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={startNavigation}
                aria-label="Start Turn-by-Turn Navigation"
                className="h-12 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base flex items-center space-x-2 shadow-2xl transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Google Maps Search & POI Overlay Modal */}
      <GoogleMapsSearchCard
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
