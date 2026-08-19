import React from 'react';
import { Maximize2, Minimize2, CornerUpRight, Navigation, Play, X } from 'lucide-react';
import { MapboxCanvas } from './MapboxCanvas';
import { LaneGuidance } from './LaneGuidance';
import { useNav } from '../../context/NavContext';

export const NavDockedViewport: React.FC = () => {
  const {
    isNavExpanded,
    setIsNavExpanded,
    navStatus,
    destinationName,
    eta,
    primaryManeuver,
    availableRoutes,
    selectedRouteIndex,
    selectRoute,
    startNavigation,
    endNavigation,
    recenterMap,
  } = useNav();

  return (
    <div
      className="w-full h-full relative rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#090a0f] flex flex-col select-none"
      onClick={() => {
        // Expand map on viewport container tap if in divided view
        if (!isNavExpanded) {
          setIsNavExpanded(true);
        }
      }}
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-3.5 flex items-start justify-between pointer-events-none z-20">
        {/* Floating Turn Instruction Banner when Map is Expanded & Navigating */}
        {isNavExpanded && navStatus === 'navigating' && primaryManeuver ? (
          <div 
            className="pointer-events-auto px-6 py-3.5 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col space-y-2 font-sf select-none max-w-[420px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-4">
              <CornerUpRight className="w-9 h-9 text-white stroke-[3] flex-shrink-0" />
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
        ) : (
          <div />
        )}

        {/* Action Controls: End Route Button, Recenter Button, & Expand/Collapse Toggle */}
        <div 
          className="flex items-center space-x-2 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* End Navigation Button */}
          {navStatus !== 'idle' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                endNavigation();
              }}
              className="glass-btn h-11 px-3.5 text-red-400 hover:text-red-300 flex items-center space-x-1.5 transition-all text-xs font-semibold"
              aria-label="End Route"
              title="End Route"
            >
              <X className="w-4 h-4" />
              <span>End</span>
            </button>
          )}

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

      {/* 3. Bottom Floating Banner: Preview Confirmation Mode */}
      {navStatus === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex justify-center pointer-events-none z-30">
          <div 
            className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-5 py-3 flex flex-col font-sf select-none w-full max-w-[560px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Multi-Route Selection Tabs (if alternatives available) */}
            {availableRoutes.length > 1 && (
              <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-white/10 overflow-x-auto">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mr-1">
                  Routes:
                </span>
                {availableRoutes.map((r, idx) => {
                  const isSelected = selectedRouteIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectRoute(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white/70'
                      }`}
                    >
                      <span>{r.summary}</span>
                      <span className="text-[10px] opacity-80 tabular-nums">({r.diffStr})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Route Summary & Confirmation Actions */}
            <div className="flex items-center justify-between">
              {/* ETA Details */}
              <div className="flex flex-col min-w-0 mr-3">
                <span className="text-[11px] text-white/50 truncate font-semibold uppercase tracking-wider">
                  {destinationName}
                </span>
                <div className="flex items-baseline space-x-2.5 mt-0.5">
                  <span className="text-lg font-bold font-sf-display text-emerald-400 tabular-nums">
                    {eta.duration}
                  </span>
                  <span className="text-sm font-semibold font-sf-display text-white/80 tabular-nums">
                    {eta.distance}
                  </span>
                  <span className="text-xs text-white/40 tabular-nums">
                    {eta.arrival}
                  </span>
                </div>
              </div>

              {/* Start Navigation (Clean button without glow) & Cancel Actions */}
              <div className="flex items-center space-x-2 flex-shrink-0">
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
        </div>
      )}

      {/* 4. Bottom Floating Persistent ETA Banner: Active Navigating Mode */}
      {navStatus === 'navigating' && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex justify-center pointer-events-none z-30">
          <div 
            className="pointer-events-auto rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-2.5 flex items-center justify-between font-sf select-none w-full max-w-[420px]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Live ETA Stats */}
            <div className="flex items-baseline space-x-3.5">
              <span className="text-xl font-bold font-sf-display text-emerald-400 tabular-nums tracking-tight">
                {eta.duration}
              </span>
              <span className="text-sm font-semibold font-sf-display text-white/80 tabular-nums tracking-tight">
                {eta.distance}
              </span>
              <span className="text-xs font-medium text-white/40 tabular-nums tracking-tight">
                {eta.arrival}
              </span>
            </div>

            {/* End Route Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                endNavigation();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-300 flex items-center justify-center transition-colors"
              aria-label="End Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
