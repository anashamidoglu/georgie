import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from './LiquidGlassCard';

export const DateTimeCard: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [periodStr, setPeriodStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [dayStr, setDayStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12 || 12;
      setTimeStr(`${hours}:${minutes}`);
      setPeriodStr(period);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      setDayStr(days[now.getDay()]);
      setDateStr(`${months[now.getMonth()]} ${now.getDate()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full min-h-[116px] flex items-center justify-between select-none font-sf"
    >
      <div className="flex flex-col justify-center">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
          {dayStr}
        </span>
        <span className="text-xl font-bold text-white tracking-tight mt-0.5">
          {dateStr}
        </span>
      </div>

      <div className="flex items-baseline space-x-1.5 text-right font-sf">
        <span className="text-3xl font-bold font-sf-display text-white tabular-nums tracking-tight">
          {timeStr || '12:00'}
        </span>
        <span className="text-xs font-bold text-white/50">
          {periodStr}
        </span>
      </div>
    </LiquidGlassCard>
  );
};
