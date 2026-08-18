import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  label: string;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'crimson' | 'muted';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'green',
  className,
}) => {
  const variantStyles = {
    green: 'border-emerald-500/80 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    amber: 'border-amber-500/80 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    red: 'border-red-500/80 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    blue: 'border-sky-500/80 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    crimson: 'border-rose-600/80 text-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.2)]',
    muted: 'border-white/20 text-white/50',
  };

  return (
    <span
      className={clsx(
        'badge-pill tracking-widest uppercase transition-all duration-200',
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  );
};
