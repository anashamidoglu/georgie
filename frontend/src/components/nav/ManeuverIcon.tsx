import React from 'react';

interface ManeuverIconProps {
  type?: string;
  modifier?: string;
  instruction?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ManeuverIcon: React.FC<ManeuverIconProps> = ({
  type = 'turn',
  modifier = 'straight',
  instruction = '',
  className = 'text-white',
  size = 'md',
}) => {
  const t = (type || 'turn').toLowerCase();
  let m = (modifier || 'straight').toLowerCase();
  const instr = (instruction || '').toLowerCase();

  // If modifier is generic ('straight' or empty), infer direction from instruction text
  if (!m || m === 'straight' || m === 'none') {
    if (instr.includes('sharp right')) m = 'sharp right';
    else if (instr.includes('sharp left')) m = 'sharp left';
    else if (instr.includes('slight right') || instr.includes('bear right') || instr.includes('keep right')) m = 'slight right';
    else if (instr.includes('slight left') || instr.includes('bear left') || instr.includes('keep left')) m = 'slight left';
    else if (instr.includes('turn right') || instr.startsWith('turn right') || instr.includes('right onto') || instr.includes('take the right')) m = 'right';
    else if (instr.includes('turn left') || instr.startsWith('turn left') || instr.includes('left onto') || instr.includes('take the left')) m = 'left';
    else if (instr.includes('u-turn') || instr.includes('uturn')) m = 'uturn';
  }

  const dimensions = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  }[size];

  // 1. Destination / Arrival
  if (t === 'arrive' || t.includes('dest') || m.includes('dest') || instr.includes('destination') || instr.includes('arrive')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M12 21C12 21 19 14.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 14.5 12 21 12 21Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  // 2. U-Turn
  if (m.includes('uturn') || m.includes('u-turn') || instr.includes('u-turn')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M18 21V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V21M6 21L2.5 17.5M6 21L9.5 17.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 3. Roundabout / Rotary
  if (t.includes('roundabout') || t.includes('rotary') || instr.includes('roundabout') || instr.includes('rotary') || instr.includes('دوار') || instr.includes('ساحة')) {
    const isFirstExit =
      instr.includes('1st exit') ||
      instr.includes('first exit') ||
      instr.includes('take exit 1') ||
      instr.includes('take the 1st') ||
      (m === 'right' && !instr.includes('2nd') && !instr.includes('3rd') && !instr.includes('4th') && !instr.includes('exit'));

    const isThirdExit =
      instr.includes('3rd exit') ||
      instr.includes('third exit') ||
      instr.includes('take exit 3') ||
      instr.includes('take the 3rd') ||
      (m === 'left' && !instr.includes('2nd') && !instr.includes('1st') && !instr.includes('4th')) ||
      m === 'sharp left';

    const isFourthExit =
      instr.includes('4th exit') ||
      instr.includes('fourth exit') ||
      instr.includes('take exit 4') ||
      instr.includes('take the 4th') ||
      m === 'uturn';

    // 3a. Roundabout 1st Exit / Turn Right
    if (isFirstExit) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" opacity="0.3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M12 21.5V18.5 A6.5 6.5 0 0 0 18.5 12 H21.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 8L21.5 12L17.5 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 3b. Roundabout 3rd Exit / Turn Left
    if (isThirdExit) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" opacity="0.3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M12 21.5V18.5 A6.5 6.5 0 1 0 5.5 12 H2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 8L2.5 12L6.5 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 3c. Roundabout 4th Exit / Full Loop U-Turn
    if (isFourthExit) {
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" opacity="0.3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M13.5 21.5V18.3 A6.5 6.5 0 1 0 10.5 18.3 V21.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 17.5L10.5 21.5L14.5 17.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 3d. Roundabout 2nd Exit / Straight / Forward Flow / Default
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" opacity="0.3" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 21.5V18.5 A6.5 6.5 0 0 0 12 5.5 V2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 6.5L12 2.5L16 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 4. Sharp Right
  if (m.includes('sharp right')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M7 21V10L17 5M17 5H11M17 5V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 5. Sharp Left
  if (m.includes('sharp left')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M17 21V10L7 5M7 5H13M7 5V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 6. Slight Right / Bear Right / Keep Right / Off Ramp Right
  if (m.includes('slight right') || m.includes('keep right') || (t.includes('off ramp') && m.includes('right'))) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M8 21V14C8 11.5 10 9.5 12.5 8L17 5M17 5H11M17 5V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 7. Slight Left / Bear Left / Keep Left / Off Ramp Left
  if (m.includes('slight left') || m.includes('keep left') || (t.includes('off ramp') && m.includes('left'))) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M16 21V14C16 11.5 14 9.5 11.5 8L7 5M7 5H13M7 5V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 8. 90-Degree Right Turn
  if (m.includes('right')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M6 21V13C6 10.7909 7.79086 9 10 9H18M18 9L13 4M18 9L13 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 9. 90-Degree Left Turn
  if (m.includes('left')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M18 21V13C18 10.7909 16.2091 9 14 9H6M6 9L11 4M6 9L11 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 10. Merge
  if (t.includes('merge')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
        <path d="M12 21V4M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 21C6 16 12 14 12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 11. Straight / Default
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${dimensions} ${className}`}>
      <path d="M12 21V4M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
