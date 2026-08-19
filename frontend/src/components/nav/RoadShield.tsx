import React from 'react';

interface RoadShieldProps {
  code?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface ExitShieldProps {
  exitNumber?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Parses road codes like "E11", "E 311", "D71", "D 83", "S116", "I-95" into category and clean number
 */
function parseRoadCode(rawCode?: string): { type: 'E' | 'D' | 'S' | 'generic'; number: string } | null {
  if (!rawCode) return null;
  const cleaned = rawCode.trim().toUpperCase();

  // Match UAE E-Routes (e.g. E11, E 311, E-11, E11 (NORTH))
  const matchE = cleaned.match(/^E[-\s]?(\d{1,4})/i);
  if (matchE) {
    return { type: 'E', number: matchE[1] };
  }

  // Match Dubai D-Routes (e.g. D71, D 83, D-71, D71 (EAST))
  const matchD = cleaned.match(/^D[-\s]?(\d{1,4})/i);
  if (matchD) {
    return { type: 'D', number: matchD[1] };
  }

  // Match Sharjah S-Routes (e.g. S116, S 120, S-115)
  const matchS = cleaned.match(/^S[-\s]?(\d{1,4})/i);
  if (matchS) {
    return { type: 'S', number: matchS[1] };
  }

  return { type: 'generic', number: cleaned };
}

/**
 * Authentic UAE National Highway Falcon Shield (E-Routes)
 * Official Royal Blue Falcon silhouette with yellow 'E', Arabic 'إ', and route number
 */
export const EmiratesFalconShield: React.FC<{ number: string; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const dimensions = {
    sm: { width: 28, height: 35 },
    md: { width: 34, height: 42 },
    lg: { width: 44, height: 55 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 100 125"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`UAE Highway E ${number}`}</title>
      {/* UAE National Falcon Silhouette Body */}
      <path
        d="M 50 10
           C 46 8, 41 8, 38 12
           C 36 14, 36 17, 39 19
           C 35 22, 33 24, 34 26
           C 38 27, 43 25, 46 22
           C 43 27, 42 32, 45 35
           C 33 34, 22 37, 16 46
           C 13 52, 12 60, 16 68
           C 14 70, 12 73, 15 76
           C 12 80, 12 86, 17 90
           C 14 93, 14 97, 18 100
           C 18 107, 21 113, 27 116
           C 36 121, 64 121, 73 116
           C 79 113, 82 107, 82 100
           C 86 97, 86 93, 83 90
           C 88 86, 88 80, 85 76
           C 88 73, 86 70, 84 68
           C 88 60, 87 52, 84 46
           C 78 37, 67 34, 55 35
           C 58 32, 57 27, 54 22
           C 57 25, 62 27, 66 26
           C 67 24, 65 22, 61 19
           C 64 17, 64 14, 62 12
           C 59 8, 54 8, 50 10 Z"
        fill="#003882"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      {/* English 'E' */}
      <text
        x="34"
        y="58"
        fill="#FFC20E"
        fontSize="25"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        E
      </text>

      {/* Arabic 'إ' */}
      <text
        x="67"
        y="58"
        fill="#FFC20E"
        fontSize="27"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        إ
      </text>

      {/* Highway Number in Heavy Road Font */}
      <text
        x="50"
        y="104"
        fill="#FFC20E"
        fontSize={number.length > 2 ? '36' : '44'}
        fontWeight="900"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={number.length > 2 ? '-1.5' : '-0.5'}
      >
        {number}
      </text>
    </svg>
  );
};

/**
 * Authentic Dubai City Route Fort Shield (D-Routes)
 * Official RTA Green Castle/Fortress tower silhouette with yellow 'D', Arabic 'د', and route number
 */
export const DubaiFortShield: React.FC<{ number: string; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const dimensions = {
    sm: { width: 28, height: 35 },
    md: { width: 34, height: 42 },
    lg: { width: 44, height: 55 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 100 125"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`Dubai Route D ${number}`}</title>
      {/* Dubai Fort / Castle Silhouette with Crenellations */}
      <path
        d="M 20 18
           L 32 18 L 32 25 L 42 25 L 42 18 L 58 18 L 58 25 L 68 25 L 68 18 L 80 18
           L 82 45 L 85 48 L 82 75 L 86 78 L 82 105
           C 82 114, 68 120, 50 120
           C 32 120, 18 114, 18 105
           L 14 78 L 18 75 L 15 48 L 18 45 Z"
        fill="#007a3d"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      {/* English 'D' */}
      <text
        x="35"
        y="58"
        fill="#FFC20E"
        fontSize="25"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        D
      </text>

      {/* Arabic 'د' */}
      <text
        x="66"
        y="58"
        fill="#FFC20E"
        fontSize="27"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        د
      </text>

      {/* Road Number in Heavy Road Font */}
      <text
        x="50"
        y="104"
        fill="#FFC20E"
        fontSize={number.length > 2 ? '36' : '44'}
        fontWeight="900"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={number.length > 2 ? '-1.5' : '-0.5'}
      >
        {number}
      </text>
    </svg>
  );
};

/**
 * Authentic Sharjah Route Shield (S-Routes)
 */
export const SharjahRouteShield: React.FC<{ number: string; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const dimensions = {
    sm: { width: 28, height: 35 },
    md: { width: 34, height: 42 },
    lg: { width: 44, height: 55 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 100 125"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`Sharjah Route S ${number}`}</title>
      <path
        d="M 18 20
           L 82 20
           L 84 55
           L 88 78
           L 82 102
           C 82 114, 68 120, 50 120
           C 32 120, 18 114, 18 102
           L 12 78
           L 16 55 Z"
        fill="#0f5132"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      <text
        x="35"
        y="58"
        fill="#ffffff"
        fontSize="24"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        S
      </text>

      <text
        x="66"
        y="58"
        fill="#ffffff"
        fontSize="26"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        ش
      </text>

      <text
        x="50"
        y="104"
        fill="#ffffff"
        fontSize={number.length > 2 ? '36' : '44'}
        fontWeight="900"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={number.length > 2 ? '-1.5' : '-0.5'}
      >
        {number}
      </text>
    </svg>
  );
};

/**
 * Overhead Freeway Exit Gantry Badge
 * Official highway exit plaque with green background, white border, and '↗ Exit XX'
 */
export const ExitShield: React.FC<ExitShieldProps> = ({
  exitNumber,
  size = 'md',
  className = '',
}) => {
  if (!exitNumber) return null;

  // Clean exit number string (e.g. "Exit 50" -> "50", "Exit 29B" -> "29B")
  const numOnly = exitNumber.replace(/^exit\s*/i, '').trim();

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
    lg: 'px-3 py-1 text-sm gap-2',
  }[size];

  return (
    <div
      className={`inline-flex items-center rounded-md bg-[#006633] border border-white text-white font-black tracking-tight select-none shadow-sm font-mono ${sizeStyles} ${className}`}
      title={`Freeway Exit ${numOnly}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
      >
        <path d="M7 17L17 7M17 7H9M17 7V15" />
      </svg>
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/90 font-sans">
        EXIT
      </span>
      <span className="tabular-nums font-sf-display tracking-tight text-white">
        {numOnly}
      </span>
    </div>
  );
};

/**
 * Universal Unified Road Shield Component
 * Automatically resolves and renders authentic UAE Falcon (E), Dubai Fort (D), Sharjah (S), Exit, or generic shields
 */
export const RoadShield: React.FC<RoadShieldProps> = ({
  code,
  size = 'md',
  className = '',
}) => {
  if (!code) return null;

  const parsed = parseRoadCode(code);
  if (!parsed) return null;

  switch (parsed.type) {
    case 'E':
      return <EmiratesFalconShield number={parsed.number} size={size} />;
    case 'D':
      return <DubaiFortShield number={parsed.number} size={size} />;
    case 'S':
      return <SharjahRouteShield number={parsed.number} size={size} />;
    default:
      return (
        <div
          className={`inline-flex items-center px-2 py-0.5 rounded-md bg-blue-900/90 border border-blue-400/60 text-white font-bold text-xs tracking-wider select-none shadow-sm ${className}`}
        >
          {parsed.number}
        </div>
      );
  }
};
