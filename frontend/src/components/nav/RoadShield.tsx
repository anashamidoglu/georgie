import React from 'react';

interface RoadShieldProps {
  code?: string | number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface ExitShieldProps {
  exitNumber?: string | number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Parses road codes like "E11", "E 311", "D71", "D 83", "S116" into category and number
 */
function parseRoadCode(rawCode?: string | number | null): { type: 'E' | 'D' | 'S' | 'generic'; number: string } | null {
  if (rawCode === undefined || rawCode === null) return null;
  const rawStr = typeof rawCode === 'number' ? String(rawCode) : typeof rawCode === 'string' ? rawCode : '';
  if (!rawStr) return null;
  const cleaned = rawStr.trim().toUpperCase();

  // Match UAE E-Routes (e.g. E11, E 311, E-11, E11 (NORTH))
  const matchE = cleaned.match(/^E[-\s]?(\d{1,4})/i);
  if (matchE) {
    return { type: 'E', number: matchE[1] || '' };
  }

  // Match Dubai D-Routes (e.g. D71, D 83, D-71, D71 (EAST))
  const matchD = cleaned.match(/^D[-\s]?(\d{1,4})/i);
  if (matchD) {
    return { type: 'D', number: matchD[1] || '' };
  }

  // Match Sharjah S-Routes (e.g. S116, S 120, S-115)
  const matchS = cleaned.match(/^S[-\s]?(\d{1,4})/i);
  if (matchS) {
    return { type: 'S', number: matchS[1] || '' };
  }

  // Valid short road codes
  if (/^[A-Z0-9\s-]{1,8}$/.test(cleaned) && /\d/.test(cleaned)) {
    return { type: 'generic', number: cleaned };
  }

  return null;
}

/**
 * Exact Official UAE National Highway Falcon Shield (E-Routes)
 * Transparent background silhouette with crisp white rim
 */
export const EmiratesFalconShield: React.FC<{ number: string | number; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const numStr = String(number ?? '');
  const dimensions = {
    sm: { width: 24, height: 35 },
    md: { width: 32, height: 46 },
    lg: { width: 42, height: 60 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="316 234 330 484"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`UAE Highway E ${numStr}`}</title>

      {/* Official UAE Falcon Silhouette (Royal Blue with thin white outline) */}
      <path
        d="m 616.6,499.4 1.4,11.8 0.7,3.9 1.2,4.1 0.6,5.3 2.7,9.2 0.7,3.3 0.8,4 h -11.5 l 13.4,63.9 h -17.3 l 0.6,35.2 -5.9,4.6 -7.9,4.7 -12,6.6 -9.9,5.2 -19.9,8.1 -11.2,3.3 -7.2,1.8 -9.9,2.7 -7.3,1.5 -11.4,1.3 -9.6,1.2 -11.4,0.8 h -11.9 l -11.2,-0.8 -11.2,-0.6 -9.4,-1.3 -8.6,-2.1 -7.2,-1.2 -6.1,-2.1 -8.5,-1.8 -7.3,-2.7 -7.9,-3.3 -9.2,-3.3 -8.7,-4.1 -7.3,-4.1 -5.3,-3.2 -7.2,-4.6 -6.6,-3.9 -3.9,-2.7 0.6,-35.2 H 332.2 L 345.4,541 H 334 l 5.1,-23.2 2.4,-8.4 0.6,-8.8 0.6,-6.6 h -9.3 l 3.9,-18.5 1.4,-10.6 2,-11.3 0.8,-8.6 0.6,-5.1 -12.8,1.2 2.9,-6 1.8,-8.4 0.8,-4.7 0.7,-6.7 v -7.2 l -0.7,-7.4 -0.8,-6.5 v -6.6 l 0.8,-7.9 1.9,-8 2,-6 2,-5.1 2,-3.9 2.7,-4.8 2.8,-4 3.9,-4.5 2.6,-3.3 4,-3.3 6.6,-3.4 3.9,-1.4 5.4,-0.6 4.5,0.6 6.1,1.4 5.1,2.6 6,3.2 6,2.7 4.5,1.5 5.4,0.6 h 4.5 l 5.5,-1.5 4.6,-0.6 3.3,-1.2 6.5,-3.3 3.3,-2.7 3.4,-2.1 7.2,-7.2 2.7,-3.3 0.6,-3.9 0.9,-2.7 -0.9,-3.3 -1.8,-1.2 -1.5,-0.7 -1.9,-1.4 -2,-1.8 -0.7,-2.1 -0.6,-1.2 -13.2,-1.4 -2,4.7 -1.3,-1.5 -0.6,-1.8 -0.8,-2.7 -0.6,-2.2 0.6,-2.5 0.8,-2 2.5,-3.9 1.4,-1.5 2.7,-1.2 3.9,-2.7 2.6,-1.8 4,-4.2 1.9,-2.5 1.4,-1.4 2.7,-1.2 4,-0.7 6,-0.8 4.5,-0.6 h 4.5 l 6,0.6 4.8,1.5 4.5,1.8 2.8,2.7 2.6,3.2 3.3,4 5.3,9.3 2,5.4 1.9,4.6 1.4,4.5 1.2,5.4 2.1,5.4 1.8,3.9 6.7,7.8 2,2.7 2.8,1.3 3.3,2.6 3.9,1.5 5.8,1.2 h 6.6 l 4.7,-0.6 6,-1.4 4,-1.3 3.9,-2 4,-2.6 4.7,-2.7 3.9,-1.4 4.5,-1.2 h 4 l 5.4,0.6 4,1.4 4.7,1.9 7.9,6.6 3.3,3.3 5.3,6.6 2.4,4.1 4.9,9.2 1.8,5.9 2.1,5.5 0.6,3.9 1.5,7.1 V 396 l -0.8,5.4 -0.7,6.1 v 5.1 l 0.7,7.5 v 4.5 l 1.4,3.9 1.3,5.4 1.4,4.6 1.2,2.6 -12.6,-1.2 0.6,5.7 0.8,7.4 0.7,6 1.2,7.4 1.4,9.1 1.3,6.5 0.6,4.1 0.7,3.4 1.4,4.5 H 616 Z"
        fill="#0044aa"
        stroke="#ffffff"
        strokeWidth="3.5"
      />

      {/* Official English 'E' */}
      <path
        d="m 435,428.9 h -36.1 v -20.6 h 31 v -11.5 h -31 v -19.8 h 33.9 v -11.6 h -46.8 v 75 h 49 z"
        fill="#ffcc00"
      />

      {/* Official Arabic 'إ' */}
      <g fill="#ffcc00">
        <path d="m 567,412.8 1.4,-3.2 0.7,-4.8 0.6,-7.9 0.6,-13.9 v -8 l -0.6,-5.7 -1.3,-8.7 -0.8,-7.2 -0.6,-1.5 -1.2,1.5 -9.4,11.1 -0.6,0.6 v 9.9 l 0.6,6 0.7,6.6 0.6,9.9 v 16 l -1.3,13.2 h 1.3 l 0.8,-1.5 2.5,-3.2 4.2,-6.7 z" />
        <path d="m 566.2,450.6 6.5,-8.6 h -2.6 l -2.5,0.6 -3.3,-0.6 -5.4,-1.3 -1.2,-1.4 1.2,-1.2 h 2.1 l 3.3,0.6 1.9,0.6 2.6,-5.2 V 432 l -1.2,-1.2 h -3.3 l -4.2,0.6 -3.2,1.8 -4,4.2 -1.9,3.3 -1.4,1.9 0.6,3.9 2,2.6 1.3,0.6 -3.3,6.8 10.8,-4.7 2.5,-1.2 z" />
      </g>

      {/* Dynamic Road Number in Official Bold Highway Font */}
      <text
        x="479"
        y="620"
        fill="#ffcc00"
        fontSize={numStr.length > 2 ? '140' : '176'}
        fontWeight="bold"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={numStr.length > 2 ? '-6' : '-2'}
      >
        {numStr}
      </text>
    </svg>
  );
};

/**
 * Exact Official Dubai Fort / Castle Route Shield (D-Routes)
 * Transparent background silhouette with crisp white rim
 */
export const DubaiFortShield: React.FC<{ number: string | number; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const numStr = String(number ?? '');
  const dimensions = {
    sm: { width: 26, height: 35 },
    md: { width: 34, height: 45 },
    lg: { width: 44, height: 58 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="286 106 278 352"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`Dubai Route D ${numStr}`}</title>

      {/* Official Dubai Fort Castle Silhouette with 7 Battlements (RTA Green with thin white outline) */}
      <path
        d="m 299.7,108.4 v 69.2 h 10.5 c -10.5,44.5 -10.5,89.8 -10.5,134.9 0,47 0,141.2 0,141.2 l 250.1,0.1 V 312.5 c 0,-45.1 0,-90.4 -10.5,-134.9 h 10.5 V 108.4 H 527 v 23.1 h -22.8 v -23.1 h -22.7 v 23.1 H 458.8 V 108.4 H 436 v 23.1 h -22.7 v -23.1 h -22.7 v 23.1 h -22.7 v -23.1 h -22.7 v 23.1 h -22.8 l 0.1,-23.1 z"
        fill="#00703c"
        stroke="#ffffff"
        strokeWidth="3.5"
      />

      {/* Official English 'D' */}
      <path
        d="m 384.7,203.05 c 0,12.4 -5.7,26.5 -20,26.5 h -15.2 v -52 h 15.9 c 12.9,0 19.3,14.5 19.3,25.5 z m 12.9,0 c 0,-18.2 -10.1,-37 -33.3,-37 h -27.6 v 75 h 27.5 c 23.3,0 33.4,-17.8 33.4,-38 z"
        fill="#ffcc00"
      />

      {/* Official Arabic 'د' */}
      <path
        fill="#ffcc00"
        d="m 501.8,236 h -48.4 l 4.6,-21.1 h 36.3 l -0.8,-5.4 -2.3,-4.5 -4.5,-3.8 -4.5,-4.5 -7.6,-4.5 -4.5,-0.8 0.7,-5.3 4.6,-7.6 2.2,-6 2.3,-1.5 5.3,1.5 6,3 8.4,6.8 6,8.3 3.8,7.6 2.3,5.3 0.7,6 -0.7,5.4 -3.1,9.1 z"
      />

      {/* Dynamic Road Number in Official Bold Highway Font */}
      <text
        x="424"
        y="395"
        fill="#ffcc00"
        fontSize={numStr.length > 2 ? '135' : '176'}
        fontWeight="bold"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={numStr.length > 2 ? '-6' : '-2'}
      >
        {numStr}
      </text>
    </svg>
  );
};

/**
 * Official Sharjah Route Shield (S-Routes)
 * Transparent background silhouette
 */
export const SharjahRouteShield: React.FC<{ number: string | number; size?: 'sm' | 'md' | 'lg' }> = ({
  number,
  size = 'md',
}) => {
  const numStr = String(number ?? '');
  const dimensions = {
    sm: { width: 24, height: 35 },
    md: { width: 32, height: 46 },
    lg: { width: 42, height: 60 },
  }[size];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="4 4 92 122"
      className="inline-block flex-shrink-0 select-none filter drop-shadow-sm"
    >
      <title>{`Sharjah Route S ${numStr}`}</title>
      
      {/* Sharjah Green Shield */}
      <path
        d="M 6 6 L 94 6 L 94 92 C 94 116, 75 124, 50 124 C 25 124, 6 116, 6 92 Z"
        fill="#0f5132"
        stroke="#ffffff"
        strokeWidth="2.5"
      />

      <text
        x="30"
        y="46"
        fill="#ffffff"
        fontSize="24"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        S
      </text>

      <text
        x="70"
        y="46"
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
        y="98"
        fill="#ffffff"
        fontSize={numStr.length > 2 ? '38' : '48'}
        fontWeight="bold"
        fontFamily="'SF Pro Display', 'DIN Alternate', 'DIN 1451', 'Arial Black', sans-serif"
        textAnchor="middle"
        letterSpacing={numStr.length > 2 ? '-2' : '-0.5'}
      >
        {numStr}
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
  if (exitNumber === undefined || exitNumber === null) return null;

  // Clean exit number string (e.g. 50 -> "50", "Exit 50" -> "50", "Exit 29B" -> "29B")
  const rawStr = typeof exitNumber === 'number' ? String(exitNumber) : typeof exitNumber === 'string' ? exitNumber : '';
  if (!rawStr) return null;

  const numOnly = rawStr.replace(/^exit\s*/i, '').trim();
  if (!numOnly) return null;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1.5 rounded-md',
    md: 'px-3 py-1 text-sm gap-2 rounded-lg',
    lg: 'px-4 py-1.5 text-base gap-2.5 rounded-lg',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const exitLabelSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  const numSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div
      className={`inline-flex items-center bg-[#006633] border border-white text-white font-bold tracking-tight select-none shadow-sm font-sf ${sizeStyles} ${className}`}
      title={`Freeway Exit ${numOnly}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconSizes}
      >
        <path d="M7 17L17 7M17 7H9M17 7V15" />
      </svg>
      <span className={`${exitLabelSizes} font-bold text-white/95 font-sf`}>
        Exit
      </span>
      <span className={`${numSizes} tabular-nums font-sf-display font-bold tracking-tight text-white`}>
        {numOnly}
      </span>
    </div>
  );
};

/**
 * Universal Unified Road Shield Component
 */
export const RoadShield: React.FC<RoadShieldProps> = ({
  code,
  size = 'md',
  className = '',
}) => {
  if (code === undefined || code === null) return null;

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
          className={`inline-flex items-center px-2.5 py-1 rounded-md bg-blue-900/90 border border-blue-400/60 text-white font-bold text-xs tracking-wider select-none shadow-sm ${className}`}
        >
          {parsed.number}
        </div>
      );
  }
};
