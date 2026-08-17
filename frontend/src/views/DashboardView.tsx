import React from "react";
import { useNav } from "../context/NavContext";
import { NavBanner } from "../components/nav/NavBanner";
import { SpeedLimitBadge } from "../components/nav/SpeedLimitBadge";
import { MediaDockedCard } from "../components/media/MediaDockedCard";
import { Maximize2, Minimize2 } from "lucide-react";

export const DashboardView: React.FC = () => {
  const { navExpanded, toggleNavExpanded, activeRoute, currentSpeed } = useNav();

  return (
    <div className="w-full h-full relative p-4 flex gap-4 overflow-hidden">
      {/* Navigation / Map Pane Container */}
      <div
        className={`relative transition-all duration-300 rounded-[20px] overflow-hidden border border-surface-raised-border shadow-md ${
          navExpanded ? "w-full h-full" : "w-[62%] h-full"
        }`}
      >
        {/* Floating Controls over Map */}
        <div className="absolute top-4 left-4 z-20">
          <NavBanner
            instruction={activeRoute?.next_maneuver?.instruction}
            distanceMeters={activeRoute?.next_maneuver?.distance_meters}
            lanes={activeRoute?.lanes}
          />
        </div>

        {/* Speed Limit Badge */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="glass-surface p-2.5 rounded-2xl">
            <SpeedLimitBadge
              speedLimit={activeRoute?.speed_limit || 100}
              currentSpeed={currentSpeed}
            />
          </div>
        </div>

        {/* Expand / Collapse Map View State Button */}
        <button
          onClick={toggleNavExpanded}
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-xl glass-surface flex items-center justify-center text-text-primary touch-press"
          aria-label={navExpanded ? "Dock Nav" : "Expand Nav"}
        >
          {navExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Media Docked Pane (Hidden when nav is expanded) */}
      {!navExpanded && (
        <div className="w-[38%] h-full flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex-1">
            <MediaDockedCard />
          </div>
        </div>
      )}
    </div>
  );
};
