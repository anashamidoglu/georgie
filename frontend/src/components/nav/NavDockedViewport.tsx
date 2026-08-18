import React from 'react';
import { Maximize2, Minimize2, CornerUpRight, Navigation, Play, X } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { MapboxCanvas } from './MapboxCanvas';
import { useNav } from '../../context/NavContext';

export const NavDockedViewport: React.FC = () => {
  const {
    isNavExpanded,
    setIsNavExpanded,
    navStatus,
    eta,
    primaryManeuver,
    startNavigation,
    endNavigation,
    recenterMap,
    destinationName,
  } = useNav();

  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full relative overflow-hidden bg-[#09090b]"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none z-10">
        {/* Floating Turn Instruction Banner when Map is Expanded & Navigating */}
        {isNavExpanded && navStatus === 'navigating' && primaryManeuver ? (
          <div className="pointer-events-auto px-6 py-4 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex items-center space-x-5 font-sf select-none animate-in fade-in duration-200">
            <CornerUpRight className="w-10 h-10 text-white stroke-[3] flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
                {primaryManeuver.distanceStr}
              </span>
              <span className="text-base font-semibold text-white/85 mt-1 truncate max-w-[280px]">
                {primaryManeuver.instruction || primaryManeuver.roadName}
              </span>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Action Controls: Recenter Button, End Nav Button (if navigating), & Expand/Collapse Toggle */}
        <div className="flex items-center space-x-2.5 pointer-events-auto">
          {/* End Navigation Button */}
          {navStatus !== 'idle' && (
            <button
              type="button"
              onClick={endNavigation}
              className="glass-btn h-11 px-3 text-red-400 hover:text-red-300 flex items-center space-x-1.5 transition-all text-xs font-semibold"
              aria-label="End Navigation"
              title="End Route"
            >
              <X className="w-4 h-4" />
              <span>End</span>
            </button>
          )}

          {/* Recenter Location Button */}
          <button
            type="button"
            onClick={recenterMap}
            className="glass-btn w-11 h-11 text-white/80 hover:text-white flex items-center justify-center transition-all"
            aria-label="Recenter location"
            title="Recenter location"
          >
            <Navigation className="w-5 h-5 text-sky-400 fill-sky-400/20" />
          </button>

          {/* Expand / Collapse Map Toggle Button */}
          <button
            type="button"
            onClick={() => setIsNavExpanded(!isNavExpanded)}
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

      {/* 3. Bottom Floating Overlays: Preview Confirmation vs. Active Nav ETA Banner */}
      {navStatus === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none z-20 animate-in slide-in-from-bottom duration-300">
          <div className="pointer-events-auto rounded-3xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-3 flex items-center justify-between font-sf select-none w-full max-w-[560px]">
            {/* Route Summary */}
            <div className="flex flex-col min-w-0 mr-4">
              <span className="text-xs text-white/50 truncate font-semibold uppercase tracking-wider">
                {destinationName}
              </span>
              <div className="flex items-baseline space-x-3 mt-0.5">
                <span className="text-xl font-bold font-sf-display text-emerald-400 tabular-nums">
                  {eta.duration}
                </span>
                <span className="text-sm font-semibold font-sf-display text-white/80 tabular-nums">
                  {eta.distance}
                </span>
                <span className="text-xs text-white/50 tabular-nums">
                  {eta.arrival}
                </span>
              </div>
            </div>

            {/* Start Navigation Action */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={endNavigation}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Cancel route"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={startNavigation}
                className="h-11 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all font-sf tracking-tight"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Navigation ETA Banner (Never disappears when navigating, regardless of media state) */}
      {navStatus === 'navigating' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none z-10">
          <div 
            className={`pointer-events-auto rounded-3xl bg-black/90 border border-white/15 shadow-2xl backdrop-blur-md flex items-center justify-around font-sf select-none transition-all duration-300 ${
              isNavExpanded 
                ? 'h-14 px-8 w-full max-w-[620px]' 
                : 'h-12 px-6 w-full'
            }`}
          >
            {/* Arrival Time */}
            <div className="flex items-baseline">
              <span className={`font-bold font-sf-display tabular-nums text-white tracking-tight ${isNavExpanded ? 'text-lg' : 'text-base'}`}>
                {eta.arrival}
              </span>
            </div>

            {/* Duration with prominent green numeral */}
            <div className="flex items-baseline">
              <span className={`font-bold font-sf-display tabular-nums text-emerald-400 ${isNavExpanded ? 'text-xl' : 'text-base'}`}>
                {eta.duration}
              </span>
            </div>

            {/* Distance with prominent numeral */}
            <div className="flex items-baseline">
              <span className={`font-bold font-sf-display tabular-nums text-white/90 ${isNavExpanded ? 'text-lg' : 'text-base'}`}>
                {eta.distance}
              </span>
            </div>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  );
};
