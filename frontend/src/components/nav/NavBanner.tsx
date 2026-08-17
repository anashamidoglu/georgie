import React from "react";
import { CornerUpRight } from "lucide-react";
import { LaneArrow } from "../common/LaneArrow";
import type { LaneComponent } from "../../types";

interface NavBannerProps {
  instruction?: string;
  distanceMeters?: number;
  lanes?: LaneComponent[];
}

export const NavBanner: React.FC<NavBannerProps> = ({
  instruction = "Take Exit 45 toward Financial Centre",
  distanceMeters = 400,
  lanes = []
}) => {
  return (
    <div className="glass-surface rounded-2xl p-4 flex flex-col gap-3 max-w-lg">
      <div className="flex items-center gap-4">
        {/* Maneuver Glyphs */}
        <div className="w-12 h-12 rounded-xl bg-accent-green/20 text-accent-green flex items-center justify-center shrink-0 border border-accent-green/30">
          <CornerUpRight size={28} strokeWidth={2.2} />
        </div>

        {/* Distance and Instruction */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="font-road text-2xl font-bold tabular-nums text-text-primary">
              {distanceMeters >= 1000 ? (distanceMeters / 1000).toFixed(1) : distanceMeters}
            </span>
            <span className="text-xs text-text-secondary font-medium uppercase">
              {distanceMeters >= 1000 ? "km" : "m"}
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary truncate">
            {instruction}
          </p>
        </div>
      </div>

      {/* Lane Guidance Strip */}
      {lanes.length > 0 && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-surface-raised-border/50">
          {lanes.map((lane, idx) => (
            <LaneArrow
              key={idx}
              indications={lane.indications}
              active={lane.active}
              valid={lane.valid}
              size={24}
            />
          ))}
        </div>
      )}
    </div>
  );
};
