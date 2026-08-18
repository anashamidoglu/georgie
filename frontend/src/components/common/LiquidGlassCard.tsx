import React from 'react';
import { clsx } from 'clsx';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className,
  padding = 'md',
  onClick,
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-surface relative overflow-hidden transition-all duration-200',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
