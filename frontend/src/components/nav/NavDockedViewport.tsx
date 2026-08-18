import React from 'react';
import { Maximize2, Minimize2, CornerUpRight } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { MapboxCanvas } from './MapboxCanvas';
import { useNav } from '../../context/NavContext';

export const NavDockedViewport: React.FC = () => {
  const { isNavExpanded, setIsNavExpanded, hasActiveRoute, eta } = useNav();

  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full relative overflow-hidden bg-[#09090b]"
    >
      {/* 1. Full-bleed Live Mapbox Canvas (100% width & height) */}
      <MapboxCanvas />

      {/* 2. Top Floating Overlays */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none z-10">
        {/* Floating Turn Instruction Banner when Map is Expanded */}
        {isNavExpanded && hasActiveRoute ? (
          <div className="pointer-events-auto px-6 py-4 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md flex items-center space-x-5 font-sf select-none animate-in fade-in duration-200">
            <CornerUpRight className="w-10 h-10 text-white stroke-[3] flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-sf-display tabular-nums text-white tracking-tight leading-none">
                1.5 km
              </span>
              <span className="text-base font-semibold text-white/85 mt-1 truncate max-w-[280px]">
                Bear Valley Rd
              </span>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Expand / Collapse Map Toggle Button */}
        <button
          type="button"
          onClick={() => setIsNavExpanded(!isNavExpanded)}
          className="pointer-events-auto glass-btn w-11 h-11 text-white/80 hover:text-white"
          aria-label={isNavExpanded ? 'Collapse Map' : 'Expand Map'}
        >
          {isNavExpanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 3. Bottom Floating ETA Banner Overlay */}
      {hasActiveRoute && (
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

            {/* Duration with prominent numeral */}
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
