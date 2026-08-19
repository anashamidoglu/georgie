import React from 'react';
import { Maximize2, Minimize2, Navigation, Play, X, Search, Plus } from 'lucide-react';
import { MapboxCanvas } from './MapboxCanvas';
import { LaneGuidance } from './LaneGuidance';
import { ManeuverIcon } from './ManeuverIcon';
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
    removeWaypoint,
    eta,
    primaryManeuver,
    activeRoute,
    startNavigation,
    endNavigation,
    recenterMap,
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
        {/* Left Section: Turn Banner (Navigating) or Search Button (Idle/Preview) */}
        {isNavExpanded && navStatus === 'navigating' && primaryManeuver ? (
          <div 
            className="pointer-events-auto px-6 py-3.5 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col space-y-2 font-sf select-none max-w-[420px]"
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
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
                    {primaryManeuver.distanceStr}
                  </span>
                  {primaryManeuver.shield && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase">
                      {primaryManeuver.shield}
                    </span>
                  )}
                  {primaryManeuver.exitNumber && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase">
                      {primaryManeuver.exitNumber}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-white/85 mt-0.5 truncate max-w-[280px]">
                  {primaryManeuver.instruction || primaryManeuver.roadName}
                </span>
              </div>
            </div>

            {/* Embedded Lane Strip in Expanded Mode */}
            {primaryManeuver.lanes && primaryManeuver.lanes.length > 0 && (
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                  Lanes
                </span>
                <LaneGuidance lanes={primaryManeuver.lanes} size="sm" />
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

        {/* Action Controls: Recenter Button & Expand/Collapse Toggle */}
        <div 
          className="flex items-center space-x-2 pointer-events-auto"
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

      {/* 3. Bottom Floating Banner: Preview Confirmation Mode with Multi-Stop Waypoints */}
      {navStatus === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col items-center pointer-events-none z-30 space-y-2">
          {/* Waypoints horizontal badge strip */}
          {waypoints.length > 0 && (
            <div className="pointer-events-auto flex items-center space-x-2 overflow-x-auto max-w-[500px] w-full px-1 scrollbar-none">
              {waypoints.map((wp, idx) => (
                <div
                  key={wp.id}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/90 border border-amber-500/30 text-xs font-semibold text-white/90 shadow-lg backdrop-blur-md flex-shrink-0"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{wp.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWaypoint(wp.id);
                    }}
                    className="w-4 h-4 rounded-full hover:bg-white/20 text-white/50 hover:text-white flex items-center justify-center transition-colors ml-0.5"
                    title="Remove stop"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-5 py-3 flex items-center justify-between font-sf select-none w-full max-w-[500px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Route Summary & Google Maps Style Traffic-Colored ETA */}
            <div className="flex flex-col min-w-0 mr-3">
              <span className="text-[11px] text-white/50 truncate font-semibold uppercase tracking-wider">
                {waypoints.length > 0 ? `${destinationName} (${waypoints.length + 1} stops)` : destinationName}
              </span>
              <div className="flex items-baseline space-x-4 mt-0.5">
                <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight ${trafficColorClass}`}>
                  {eta.duration}
                </span>
                <span className="text-xl font-bold font-sf-display text-white/90 tabular-nums">
                  {eta.distance}
                </span>
                <span className="text-sm font-semibold font-sf-display text-white/50 tabular-nums">
                  {eta.arrival}
                </span>
              </div>
            </div>

            {/* Action Buttons: Add Stop, Cancel [X], Start Navigation */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddStopMode(true);
                  setIsSearchOpen(true);
                }}
                className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white flex items-center space-x-1 transition-colors text-xs font-semibold"
                title="Add a stop along route"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Stop</span>
              </button>

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
            <div className="flex items-baseline space-x-5 mr-3">
              <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight ${trafficColorClass}`}>
                {eta.duration}
              </span>
              <span className="text-xl font-bold font-sf-display text-white/90 tabular-nums tracking-tight">
                {eta.distance}
              </span>
              <span className="text-sm font-semibold font-sf-display text-white/50 tabular-nums tracking-tight">
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
