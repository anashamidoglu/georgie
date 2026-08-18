import React from 'react';
import { Maximize2, Minimize2, CornerUpRight, Navigation, X } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { MapboxCanvas } from './MapboxCanvas';
import { useNav } from '../../context/NavContext';

export const NavDockedViewport: React.FC = () => {
  const {
    isNavExpanded,
    setIsNavExpanded,
    hasActiveRoute,
    eta,
    primaryManeuver,
    endNavigation,
    recenterMap,
  } = useNav();

  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full relative overflow-hidden bg-[#09090b]"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-3.5 flex items-start justify-between pointer-events-none z-20">
        {/* Floating Turn Instruction Banner when Map is Expanded & Nav is Active */}
        {isNavExpanded && hasActiveRoute && primaryManeuver ? (
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

        {/* Action Controls: End Nav Button (if active), Recenter Button, & Expand/Collapse Toggle */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* End Navigation Button */}
          {hasActiveRoute && (
            <button
              type="button"
              onClick={endNavigation}
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

      {/* 3. Bottom Floating ETA Banner — ALWAYS VISIBLE whenever Navigation is Active */}
      {hasActiveRoute && (
        <div className="absolute bottom-0 left-0 right-0 p-3.5 flex justify-center pointer-events-none z-30">
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
                {eta.arrival || '10:30 arrival'}
              </span>
            </div>

            {/* Duration with prominent emerald green numeral */}
            <div className="flex items-baseline">
              <span className={`font-bold font-sf-display tabular-nums text-emerald-400 ${isNavExpanded ? 'text-xl' : 'text-base'}`}>
                {eta.duration || '20 min'}
              </span>
            </div>

            {/* Distance with prominent numeral */}
            <div className="flex items-baseline">
              <span className={`font-bold font-sf-display tabular-nums text-white/90 ${isNavExpanded ? 'text-lg' : 'text-base'}`}>
                {eta.distance || '47 km'}
              </span>
            </div>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  );
};
