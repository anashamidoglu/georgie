import React, { useState, useEffect } from 'react';
import { Wifi, Bluetooth, StepForward, StepBack, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useNav } from '../../context/NavContext';
import { useMedia } from '../../context/MediaContext';
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

  const {
    navStatus,
    previewRouteTo,
    endNavigation,
    allSteps,
    activeStepIndex,
    nextSimulationStep,
    prevSimulationStep,
  } = useNav();

  const {
    hasActiveMedia,
    setHasActiveMedia,
    currentTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
  } = useMedia();

  const PRESETS: { label: string; coords: [number, number] }[] = [
    { label: 'UOS Medical', coords: [55.4855, 25.2917] },
    { label: 'MCC', coords: [55.4077, 25.2155] },
    { label: 'Dubai Mall', coords: [55.2785, 25.1972] },
  ];

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
    <header className="w-full h-12 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#09090b] select-none z-30 font-sf">
      {/* Left: Quick Destination Shortcuts & Step Simulator */}
      <div className="flex items-center space-x-2">
        {/* Preset Shortcuts */}
        <div className="flex items-center space-x-1 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/10">
          <span className="text-[9px] font-sf font-semibold text-white/40 uppercase tracking-wider mr-1">
            Route:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => previewRouteTo(p.coords, p.label)}
              className="text-[9px] font-sf font-medium px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/20 text-white/80 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Driving Step Simulator (Active during Navigation) */}
        {navStatus === 'navigating' && allSteps.length > 0 && (
          <div className="flex items-center space-x-1 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/30 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={prevSimulationStep}
              disabled={activeStepIndex <= 0}
              className="p-0.5 text-white/70 hover:text-white disabled:opacity-30 transition-opacity"
              title="Previous Turn"
            >
              <StepBack className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-sf font-bold text-sky-300 px-1 tabular-nums">
              Step {activeStepIndex + 1}/{allSteps.length}
            </span>
            <button
              type="button"
              onClick={nextSimulationStep}
              disabled={activeStepIndex >= allSteps.length - 1}
              className="p-0.5 text-white/70 hover:text-white disabled:opacity-30 transition-opacity"
              title="Next Turn"
            >
              <StepForward className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Center/Right: Mini Media Pill (Active when navigating/previewing and media is on) */}
      <div className="flex items-center space-x-2.5">
        {hasActiveMedia && (
          <div className="flex items-center space-x-2 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm">
            {/* Tiny Album Thumbnail */}
            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt="Art"
                className="w-5 h-5 rounded-full object-cover border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">
                ♪
              </div>
            )}

            {/* Track Title */}
            <span className="text-[10px] font-bold text-white max-w-[85px] truncate">
              {currentTrack.title}
            </span>

            {/* Mini Playback Controls */}
            <div className="flex items-center space-x-0.5">
              <button
                type="button"
                onClick={prevTrack}
                className="p-0.5 text-white/60 hover:text-white transition-colors"
                title="Previous Track"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="p-0.5 text-white hover:text-emerald-400 transition-colors"
                title={currentTrack.isPlaying ? 'Pause' : 'Play'}
              >
                {currentTrack.isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 fill-white" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="p-0.5 text-white/60 hover:text-white transition-colors"
                title="Next Track"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Dev Nav Toggle */}
        <button
          type="button"
          onClick={() => {
            if (navStatus === 'idle') {
              previewRouteTo([55.4855, 25.2917], 'UOS Medical');
            } else {
              endNavigation();
            }
          }}
          className={`text-[9px] font-sf font-semibold px-2 py-0.5 rounded-full border transition-colors ${
            navStatus !== 'idle'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-white/5 text-white/60 border-white/10'
          }`}
        >
          [DEV] Nav ({navStatus === 'idle' ? 'Idle' : 'Active'})
        </button>

        {/* Dev Media Toggle */}
        <button
          type="button"
          onClick={() => setHasActiveMedia(!hasActiveMedia)}
          className={`text-[9px] font-sf font-semibold px-2 py-0.5 rounded-full border transition-colors ${
            hasActiveMedia
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-white/5 text-white/60 border-white/10'
          }`}
        >
          [DEV] Media ({hasActiveMedia ? 'On' : 'Off'})
        </button>

        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* Connectivity Status */}
        <div className="flex items-center space-x-2 text-white/50">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-white/90 tracking-tight">
            {connectivity.cellular}
          </span>
          {connectivity.wifi && (
            <Wifi className="w-3.5 h-3.5 text-white/80" />
          )}
          {connectivity.bluetooth && (
            <Bluetooth className="w-3.5 h-3.5 text-white/80" />
          )}
        </div>

        <div className="h-3.5 w-[1px] bg-white/10" />

        {/* Live SF Pro Clock */}
        <div className="flex items-baseline space-x-1.5 text-right">
          <span className="text-[11px] text-white/40 font-medium tracking-wide uppercase">
            {dateStr}
          </span>
          <span className="text-base font-semibold text-white tabular-nums tracking-normal">
            {timeStr || '12:00'}
          </span>
        </div>
      </div>
    </header>
  );
};
