import React from "react";
import clsx from "clsx";

interface LaneArrowProps {
  indications: ("left" | "straight" | "right" | "slight left" | "slight right" | "uturn")[];
  active: boolean;
  valid: boolean;
  size?: number;
}

export const LaneArrow: React.FC<LaneArrowProps> = ({
  indications,
  active,
  valid,
  size = 28
}) => {
  const isStraight = indications.includes("straight");
  const isRight = indications.includes("right") || indications.includes("slight right");
  const isLeft = indications.includes("left") || indications.includes("slight left");

  // Color discipline: Active -> bright accent, Inactive -> muted text, Invalid -> dimmed outlined red
  let colorClass = "text-text-muted opacity-40";
  if (!valid) {
    colorClass = "text-accent-red opacity-30";
  } else if (active) {
    colorClass = "text-accent-amber opacity-100";
  } else {
    colorClass = "text-text-secondary opacity-60";
  }

  return (
    <div
      className={clsx("flex items-center justify-center transition-opacity duration-200", colorClass)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isStraight && !isLeft && !isRight && (
          <>
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="7 10 12 5 17 10" />
          </>
        )}
        {isRight && !isStraight && (
          <>
            <path d="M6 18h6a6 6 0 0 0 6-6V6" />
            <polyline points="14 10 18 6 22 10" />
          </>
        )}
        {isLeft && !isStraight && (
          <>
            <path d="M18 18h-6a6 6 0 0 1-6-6V6" />
            <polyline points="10 10 6 6 2 10" />
          </>
        )}
        {isStraight && isRight && (
          <>
            <line x1="9" y1="19" x2="9" y2="5" />
            <polyline points="5 9 9 5 13 9" />
            <path d="M9 14h4a5 5 0 0 1 5 5v-7" />
            <polyline points="15 9 18 6 21 9" />
          </>
        )}
        {isStraight && isLeft && (
          <>
            <line x1="15" y1="19" x2="15" y2="5" />
            <polyline points="11 9 15 5 19 9" />
            <path d="M15 14h-4a5 5 0 0 0-5 5v-7" />
            <polyline points="9 9 6 6 3 9" />
          </>
        )}
      </svg>
    </div>
  );
};
