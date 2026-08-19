import React, { useState } from 'react';
import {
  ChevronDown,
  Check,
  GitFork,
  Plus,
  X,
  GripVertical,
  ChevronUp,
  MapPin,
  CircleDot,
} from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { ManeuverIcon } from './ManeuverIcon';
import { useNav } from '../../context/NavContext';

export const RouteSelectionCard: React.FC = () => {
  const {
    destinationName,
    waypoints,
    removeWaypoint,
    moveWaypoint,
    swapWaypointWithDestination,
    availableRoutes,
    selectedRouteIndex,
    selectRoute,
    activeRoute,
    setIsAddStopMode,
    setIsSearchOpen,
    inspectStep,
    inspectedStep,
  } = useNav();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);

  const currentRoute = activeRoute || availableRoutes[selectedRouteIndex];
  const legs = currentRoute?.legs || [];

  const handleOpenAddStop = () => {
    setIsAddStopMode(true);
    setIsSearchOpen(true);
  };

  const toggleLegSteps = (legIdx: number) => {
    setExpandedLegIndex(expandedLegIndex === legIdx ? null : legIdx);
  };

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full flex flex-col justify-center select-none font-sf relative transition-all duration-200"
    >
      {/* Top Header: Destination Title & Header Action Buttons (+ Add Stop / Routes) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1 mr-3">
          <span className="text-xl font-bold font-sf-display text-white truncate max-w-full tracking-tight">
            {waypoints.length > 0 ? `${destinationName} (${waypoints.length + 1} stops)` : destinationName || 'Pinned Location'}
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Add Stop Button on the Right Banner */}
          <button
            type="button"
            onClick={handleOpenAddStop}
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white flex items-center space-x-1.5 transition-colors text-xs font-semibold"
            title="Add a stop along this route"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Stop</span>
          </button>

          {/* Multi-Route Toggle Button (if more than 1 route) */}
          {availableRoutes.length > 1 && (
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center space-x-1.5 transition-colors text-xs font-semibold"
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

      {/* Journey Destinations Stack (When multi-stops exist) */}
      {waypoints.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
            Trip Stops
          </span>

          {/* 1. Origin */}
          <div className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
            <CircleDot className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-white/80 flex-1 truncate">
              Current Location
            </span>
          </div>

          {/* 2. Intermediate Waypoints */}
          {waypoints.map((wp, idx) => {
            const leg = legs[idx];
            const isLegExpanded = expandedLegIndex === idx;

            return (
              <div
                key={wp.id}
                className="rounded-2xl bg-white/[0.05] border border-amber-500/30 overflow-hidden transition-all"
              >
                <div className="flex items-center justify-between p-2.5">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                    {/* Drag / Move Handle Controls */}
                    <div className="flex items-center space-x-0.5 flex-shrink-0">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => moveWaypoint(idx, idx - 1)}
                          className="w-5 h-5 rounded hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors"
                          title="Move stop earlier"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < waypoints.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveWaypoint(idx, idx + 1)}
                          className="w-5 h-5 rounded hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors"
                          title="Move stop later"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <GripVertical className="w-3.5 h-3.5 text-white/30 cursor-grab" />
                    </div>

                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center font-mono flex-shrink-0">
                      {idx + 1}
                    </span>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {wp.name}
                      </span>
                      {leg && (
                        <span className="text-[10px] text-white/45 tabular-nums">
                          {leg.durationStr} · {leg.distanceStr}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {/* Subtle Dropdown for Leg Steps */}
                    {leg && leg.steps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleLegSteps(idx)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                      >
                        <span>{leg.steps.length} steps</span>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${
                            isLegExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}

                    {/* Swap to final destination */}
                    <button
                      type="button"
                      onClick={() => swapWaypointWithDestination(idx)}
                      className="px-1.5 py-0.5 rounded-md hover:bg-amber-500/20 text-[10px] font-semibold text-amber-300 transition-colors"
                      title="Make this the final destination"
                    >
                      Make End
                    </button>

                    {/* Delete stop */}
                    <button
                      type="button"
                      onClick={() => removeWaypoint(wp.id)}
                      className="w-6 h-6 rounded-full hover:bg-white/20 text-white/50 hover:text-white flex items-center justify-center transition-colors"
                      title="Remove stop"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Steps for this leg */}
                {isLegExpanded && leg && (
                  <div className="border-t border-white/10 bg-black/40 p-2 space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {leg.steps.map((step) => {
                      const isSelected = inspectedStep?.id === step.id;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => inspectStep(step)}
                          className={`w-full text-left flex items-start space-x-2.5 p-1.5 rounded-xl transition-colors ${
                            isSelected ? 'bg-sky-500/20 border border-sky-500/40' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="pt-0.5 flex-shrink-0">
                            <ManeuverIcon type={step.type} modifier={step.modifier} size="sm" className="text-white/80" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-white tabular-nums">
                              In {step.distanceStr}
                            </span>
                            <span className="text-[11px] text-white/70 truncate">
                              {step.instruction}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. Final Destination */}
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 overflow-hidden transition-all">
            <div className="flex items-center justify-between p-2.5">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {destinationName} (Final Destination)
                  </span>
                  {legs[legs.length - 1] && (
                    <span className="text-[10px] text-white/45 tabular-nums">
                      {legs[legs.length - 1].durationStr} · {legs[legs.length - 1].distanceStr}
                    </span>
                  )}
                </div>
              </div>

              {/* Final Leg Steps Dropdown */}
              {legs[legs.length - 1] && legs[legs.length - 1].steps.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleLegSteps(legs.length - 1)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-semibold flex items-center space-x-1 transition-colors flex-shrink-0"
                >
                  <span>{legs[legs.length - 1].steps.length} steps</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      expandedLegIndex === legs.length - 1 ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Collapsible Steps for final leg */}
            {expandedLegIndex === legs.length - 1 && legs[legs.length - 1] && (
              <div className="border-t border-white/10 bg-black/40 p-2 space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {legs[legs.length - 1].steps.map((step) => {
                  const isSelected = inspectedStep?.id === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => inspectStep(step)}
                      className={`w-full text-left flex items-start space-x-2.5 p-1.5 rounded-xl transition-colors ${
                        isSelected ? 'bg-sky-500/20 border border-sky-500/40' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="pt-0.5 flex-shrink-0">
                        <ManeuverIcon type={step.type} modifier={step.modifier} size="sm" className="text-white/80" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-white tabular-nums">
                          In {step.distanceStr}
                        </span>
                        <span className="text-[11px] text-white/70 truncate">
                          {step.instruction}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
