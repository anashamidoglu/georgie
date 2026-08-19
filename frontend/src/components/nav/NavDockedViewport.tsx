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
} from 'lucide-react';
import { MapboxCanvas } from './MapboxCanvas';
import { LaneGuidance } from './LaneGuidance';
import { ManeuverIcon } from './ManeuverIcon';
import { RoadShield, ExitShield } from './RoadShield';
import { GoogleMapsSearchCard } from './GoogleMapsSearchCard';
import { IncidentAlertBanner } from './IncidentAlertBanner';
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
    approachingIncident,
    dismissIncident,
    isRerouting,
  } = useNav();

  const trafficColorClass = activeRoute?.traffic?.colorClass || 'text-emerald-400';

  return (
    <div
      className="w-full h-full relative rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#090a0f] flex flex-col select-none"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-3.5 flex items-start justify-between pointer-events-none z-20">
        {/* Left Section: Turn Banner / Incident Banner / Rerouting Pill */}
        <div className="flex flex-col space-y-2.5 max-w-[420px]">
          {/* Dynamic Off-Route Rerouting Status Badge */}
          {isRerouting && (
            <div className="pointer-events-auto inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-black font-bold text-xs shadow-lg backdrop-blur-md animate-in fade-in duration-200">
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Rerouting...</span>
            </div>
          )}

          {/* Active Navigation Turn Banner */}
          {isNavExpanded && navStatus === 'navigating' && primaryManeuver ? (
            <div 
              className="pointer-events-auto px-6 py-3.5 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col space-y-2 font-sf select-none"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 pt-0.5">
                  <ManeuverIcon
                    type={primaryManeuver.type}
                    modifier={primaryManeuver.modifier}
                    size="lg"
                    className="text-white"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between w-full space-x-4">
                    <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none flex-shrink-0">
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
                  <span className="text-sm font-semibold text-white/95 mt-1.5 leading-snug line-clamp-2">
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
            /* Clean Top-Left Search Button */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddStopMode(false);
                setIsSearchOpen(true);
              }}
              className="pointer-events-auto glass-btn w-11 h-11 text-white hover:text-white flex items-center justify-center transition-all"
              aria-label="Search Destinations"
              title="Search Destinations"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div />
          )}

          {/* Approaching Real-Time Traffic Incident Banner (Auto-dismiss timer) */}
          {navStatus === 'navigating' && approachingIncident && (
            <IncidentAlertBanner
              incident={approachingIncident}
              onDismiss={() => dismissIncident(approachingIncident.id)}
              autoDismissSeconds={8}
            />
          )}
        </div>

        {/* Action Controls: Recenter Button & Expand/Collapse Toggle */}
        <div 
          className="flex items-center space-x-2 pointer-events-auto flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Recenter Location Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              recenterMap();
            }}
            className="glass-btn w-11 h-11 text-white/80 hover:text-white flex items-center justify-center transition-all"
            aria-label="Recenter location"
            title="Recenter location"
          >
            <Navigation className="w-5 h-5 text-sky-400 fill-sky-400/20" />
          </button>

          {/* Expand / Collapse Map Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsNavExpanded(!isNavExpanded);
            }}
            className="glass-btn w-11 h-11 text-white/80 hover:text-white flex items-center justify-center transition-all"
            aria-label={isNavExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            {isNavExpanded ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Bottom Floating Banner: Preview Confirmation Mode + Floating Add Stop Pill */}
      {navStatus === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col items-center pointer-events-none z-30 space-y-2">
          {/* Add Stop pill matching the ETA banner style, aligned to the left */}
          <div className="w-full max-w-[480px] flex justify-start px-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddStopMode(true);
                setIsSearchOpen(true);
              }}
              className="pointer-events-auto rounded-full bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-3.5 py-1.5 flex items-center space-x-1.5 text-xs font-semibold text-white/90 hover:text-white hover:border-white/40 transition-all font-sf active:scale-95"
              title="Add a stop along route"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Stop</span>
            </button>
          </div>

          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-3 flex items-center justify-between font-sf select-none w-full max-w-[480px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Route Summary & Google Maps Style Traffic-Colored ETA */}
            <div className="flex flex-col min-w-0 mr-4">
              <span className="text-[11px] text-white/50 truncate font-semibold uppercase tracking-wider">
                {waypoints.length > 0 ? `${destinationName} (${waypoints.length + 1} stops)` : destinationName}
              </span>
              <div className="flex items-baseline space-x-4 mt-0.5 whitespace-nowrap">
                <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight whitespace-nowrap ${trafficColorClass}`}>
                  {eta.duration}
                </span>
                <span className="text-xl font-bold font-sf-display text-white/90 tabular-nums whitespace-nowrap">
                  {eta.distance}
                </span>
                <span className="text-xl font-bold font-sf-display text-white/80 tabular-nums whitespace-nowrap">
                  {eta.arrival}
                </span>
              </div>
            </div>

            {/* Action Buttons: Cancel [X], Start Navigation */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  endNavigation();
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Cancel route"
              >
                <X className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startNavigation();
                }}
                className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center space-x-1.5 border border-emerald-400/30 transition-colors font-sf text-sm tracking-tight"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Floating Persistent ETA Banner: Active Navigating Mode */}
      {navStatus === 'navigating' && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex justify-center pointer-events-none z-30">
          <div 
            className="pointer-events-auto rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-2.5 flex items-center justify-between font-sf select-none w-full max-w-[480px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Live ETA Stats (Traffic Colored, Larger & Spaced) */}
            <div className="flex items-baseline space-x-5 mr-3 whitespace-nowrap">
              <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight whitespace-nowrap ${trafficColorClass}`}>
                {eta.duration}
              </span>
              <span className="text-xl font-bold font-sf-display text-white/90 tabular-nums tracking-tight whitespace-nowrap">
                {eta.distance}
              </span>
              <span className="text-xl font-bold font-sf-display text-white/80 tabular-nums tracking-tight whitespace-nowrap">
                {eta.arrival}
              </span>
            </div>

            {/* Exit Navigation Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                endNavigation();
              }}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-red-300 flex items-center space-x-1.5 transition-colors text-xs font-semibold flex-shrink-0"
              aria-label="Exit Navigation"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Google Maps Style In-Nav Search Card */}
      <GoogleMapsSearchCard
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
