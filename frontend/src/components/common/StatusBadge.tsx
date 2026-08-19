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
    green: 'border-emerald-500/80 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/80 text-amber-400 bg-amber-500/10',
    red: 'border-red-500/80 text-red-400 bg-red-500/10',
    blue: 'border-sky-500/80 text-sky-400 bg-sky-500/10',
    crimson: 'border-rose-600/80 text-rose-400 bg-rose-500/10',
    muted: 'border-white/20 text-white/50 bg-white/5',
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
