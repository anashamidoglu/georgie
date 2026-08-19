import React, { useState } from 'react';
import { ChevronDown, Check, GitFork } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';

export const RouteSelectionCard: React.FC = () => {
  const {
    destinationName,
    availableRoutes,
    selectedRouteIndex,
    selectRoute,
    activeRoute,
  } = useNav();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const currentRoute = activeRoute || availableRoutes[selectedRouteIndex];

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full flex flex-col justify-center select-none font-sf relative transition-all duration-200"
    >
      {/* Top Header: Prominent Destination Name & Route Switcher Button */}
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
            <span className="text-xs font-semibold text-white/90 truncate">
              {currentRoute.summary}
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[11px] text-white/50 tabular-nums">
                {currentRoute.distanceStr}
              </span>
              <span className="text-[11px] text-white/30">•</span>
              <span className={`text-[11px] font-semibold ${currentRoute.traffic.colorClass}`}>
                {currentRoute.traffic.label}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <span className={`text-xl font-bold font-sf-display tabular-nums tracking-tight ${currentRoute.traffic.colorClass}`}>
              {currentRoute.durationStr}
            </span>
            <span className="text-[10px] font-medium text-white/40 tabular-nums">
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
};
