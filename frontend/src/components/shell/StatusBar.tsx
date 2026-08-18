import React, { useState, useEffect } from 'react';
import { Wifi, Bluetooth } from 'lucide-react';
import type { ConnectivityStatus } from '../../types';

interface StatusBarProps {
  connectivity?: ConnectivityStatus;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectivity = {
    cellular: '5G',
    wifi: true,
    bluetooth: true,
    gpsActive: true,
  },
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const day = days[now.getDay()];
      const date = now.getDate();
      setDateStr(`${day} ${date}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full h-12 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#09090b] select-none z-30 font-sf">
      {/* Left Area (Clean, no carputer text) */}
      <div className="flex items-center" />

      {/* Right: Connectivity & Large SF Pro Clock */}
      <div className="flex items-center space-x-4">
        {/* Connectivity Status */}
        <div className="flex items-center space-x-2.5 text-white/50">
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/[0.08] text-white/90 tracking-tight">
            {connectivity.cellular}
          </span>
          {connectivity.wifi && (
            <Wifi className="w-4 h-4 text-white/80" />
          )}
          {connectivity.bluetooth && (
            <Bluetooth className="w-4 h-4 text-white/80" />
          )}
        </div>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* Live SF Pro Clock */}
        <div className="flex items-baseline space-x-2 text-right">
          <span className="text-xs text-white/40 font-medium tracking-wide uppercase">
            {dateStr}
          </span>
          <span className="text-lg font-semibold text-white tabular-nums tracking-normal">
            {timeStr || '12:00'}
          </span>
        </div>
      </div>
    </header>
  );
};
