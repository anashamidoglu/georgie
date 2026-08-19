import React, { useState, useEffect } from 'react';

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
    <div className="w-full min-h-[116px] px-6 flex items-center justify-between select-none font-sf">
      <div className="flex flex-col justify-center">
        <span className="text-sm font-bold text-white/50 uppercase tracking-widest">
          {dayStr}
        </span>
        <span className="text-2xl font-bold text-white mt-1 tracking-tight">
          {dateStr}
        </span>
      </div>

      <div className="flex items-baseline space-x-2 text-right font-sf">
        <span className="text-6xl font-bold font-sf-display text-white tabular-nums tracking-tight leading-none">
          {timeStr || '12:00'}
        </span>
        <span className="text-base font-bold text-white/50 uppercase">
          {periodStr}
        </span>
      </div>
    </div>
  );
};
