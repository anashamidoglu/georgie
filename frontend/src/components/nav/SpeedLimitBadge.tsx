import React from "react";

interface SpeedLimitBadgeProps {
  speedLimit?: number;
  currentSpeed?: number;
}

export const SpeedLimitBadge: React.FC<SpeedLimitBadgeProps> = ({
  speedLimit = 100,
  currentSpeed = 88
}) => {
  const isSpeeding = currentSpeed > speedLimit;

  return (
    <div className="flex items-center gap-2">
      {/* European/UAE circular speed limit sign */}
      <div className="w-12 h-12 rounded-full bg-white border-[4px] border-[#d92d20] flex items-center justify-center shadow-md">
        <span className="font-road font-bold text-black text-xl leading-none tracking-tight">
          {speedLimit}
        </span>
      </div>

      {/* Live Speed Readout */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-road text-3xl font-extrabold tabular-nums tracking-tight leading-none ${
              isSpeeding ? "text-accent-red" : "text-text-primary"
            }`}
          >
            {currentSpeed}
          </span>
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">km/h</span>
        </div>
      </div>
    </div>
  );
};
