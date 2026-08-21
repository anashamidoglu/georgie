import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  GitFork,
  X,
} from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';

export const RouteSelectionCard: React.FC = () => {
  const {
    destinationName,
    waypoints,
    removeWaypoint,
    reorderStop,
    availableRoutes,
    selectedRouteIndex,
    selectRoute,
    activeRoute,
  } = useNav();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const currentRoute = activeRoute || availableRoutes[selectedRouteIndex];
  const legs = currentRoute?.legs || [];
  const totalStops = waypoints.length + 1;
  const finalLeg = legs.length > 0 ? legs[legs.length - 1] : undefined;

  // Single Destination View (No extra waypoints)
  if (waypoints.length === 0) {
    return (
      <LiquidGlassCard
        padding="lg"
        className="w-full flex flex-col justify-center select-none font-sf relative transition-all duration-200"
      >
        {/* Top Header: Destination Title & Multi-Route Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1 mr-3">
            <span className="text-xl font-bold font-sf-display text-white truncate max-w-full tracking-tight">
              {destinationName || 'Pinned Location'}
            </span>
          </div>

          {/* Multi-Route Toggle Button (if more than 1 route) */}
          {availableRoutes.length > 1 && (
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center space-x-1.5 transition-colors text-xs font-semibold flex-shrink-0"
            >
              <GitFork className="w-3.5 h-3.5 text-sky-400" />
              <span>{availableRoutes.length} Routes</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Primary Route Summary */}
        {currentRoute && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col min-w-0 flex-1 mr-2">
              <span className="text-sm font-bold text-white/95 truncate">
                {currentRoute.summary}
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-white/50 tabular-nums">
                  {currentRoute.distanceStr}
                </span>
                <span className="text-xs text-white/30">•</span>
                <span className={`text-xs font-semibold ${currentRoute.traffic.colorClass}`}>
                  {currentRoute.traffic.label}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0">
              <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight ${currentRoute.traffic.colorClass}`}>
                {currentRoute.durationStr}
              </span>
              <span className="text-xs font-semibold text-white/40 tabular-nums">
                {currentRoute.diffStr}
              </span>
            </div>
          </div>
        )}

        {/* Expandable Route Options Dropdown */}
        {isDropdownOpen && availableRoutes.length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
            {availableRoutes.map((route, idx) => {
              const isSelected = selectedRouteIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    selectRoute(idx);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/40 shadow-md'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'border border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                        {route.summary}
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-white/50 tabular-nums">
                          {route.distanceStr}
                        </span>
                        <span className="text-[10px] text-white/30">•</span>
                        <span className={`text-[10px] font-semibold ${route.traffic.colorClass}`}>
                          {route.traffic.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`text-sm font-bold font-sf-display tabular-nums ${route.traffic.colorClass}`}>
                      {route.durationStr}
                    </span>
                    <span className="text-[10px] font-semibold text-white/40 tabular-nums">
                      {route.diffStr}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </LiquidGlassCard>
    );
  }

  // Multi-Stop Itinerary View: Stacked clean cards with simple up/down arrows
  return (
    <div className="w-full flex flex-col space-y-3 select-none font-sf">
      {/* 1. Intermediate Waypoints */}
      {waypoints.map((wp, idx) => {
        const leg = legs[idx];

        return (
          <LiquidGlassCard
            key={wp.id}
            padding="lg"
            className="w-full flex flex-col justify-center select-none font-sf relative transition-all duration-200 border-amber-500/30"
          >
            {/* Header: Stop Name + Reorder Up/Down + Remove Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center font-sf-display flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xl font-bold font-sf-display text-white truncate tracking-tight">
                  {wp.name}
                </span>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                {/* Move Up */}
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => reorderStop(idx, idx - 1)}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                    title="Move stop up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                )}

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => reorderStop(idx, idx + 1)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  title="Move stop down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Delete Stop */}
                <button
                  type="button"
                  onClick={() => removeWaypoint(wp.id)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors ml-1"
                  title="Remove stop"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body: Road info & Leg ETA */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className="text-sm font-bold text-white/95 truncate">
                  {leg?.summary || 'Route to Stop'}
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-white/50 tabular-nums">
                    {leg?.distanceStr || '-- km'}
                  </span>
                  <span className="text-xs text-white/30">•</span>
                  <span className={`text-xs font-semibold ${leg?.traffic?.colorClass || currentRoute.traffic.colorClass}`}>
                    {leg?.traffic?.label || currentRoute.traffic.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight ${leg?.traffic?.colorClass || currentRoute.traffic.colorClass}`}>
                  {leg?.durationStr || '-- min'}
                </span>
                <span className="text-xs font-semibold text-white/40 tabular-nums">
                  Stop {idx + 1}
                </span>
              </div>
            </div>
          </LiquidGlassCard>
        );
      })}

      {/* 2. Final Destination Card */}
      <LiquidGlassCard
        padding="lg"
        className="w-full flex flex-col justify-center select-none font-sf relative transition-all duration-200"
      >
        {/* Header: Destination Name + Move Up Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1 mr-2">
            <span className="text-xl font-bold font-sf-display text-white truncate max-w-full tracking-tight">
              {destinationName || 'Pinned Location'}
            </span>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Move Up (Swap with preceding stop) */}
            {totalStops > 1 && (
              <button
                type="button"
                onClick={() => reorderStop(waypoints.length, waypoints.length - 1)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                title="Move stop earlier"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body: Final Leg Road info & Final Leg ETA */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
          <div className="flex flex-col min-w-0 flex-1 mr-2">
            <span className="text-sm font-bold text-white/95 truncate">
              {finalLeg?.summary || currentRoute?.summary || 'Direct Route'}
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs text-white/50 tabular-nums">
                {finalLeg?.distanceStr || currentRoute?.distanceStr || '-- km'}
              </span>
              <span className="text-xs text-white/30">•</span>
              <span className={`text-xs font-semibold ${finalLeg?.traffic?.colorClass || currentRoute.traffic.colorClass}`}>
                {finalLeg?.traffic?.label || currentRoute.traffic.label}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <span className={`text-2xl font-bold font-sf-display tabular-nums tracking-tight ${finalLeg?.traffic?.colorClass || currentRoute.traffic.colorClass}`}>
              {finalLeg?.durationStr || currentRoute?.durationStr || '-- min'}
            </span>
            <span className="text-xs font-semibold text-white/40 tabular-nums">
              Final
            </span>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
