import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Bluetooth, StepForward, StepBack, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
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
  const [isMediaPopoverOpen, setIsMediaPopoverOpen] = useState<boolean>(false);
  const pillRef = useRef<HTMLDivElement | null>(null);

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

  // Format track duration seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, (currentTrack.currentTime / (currentTrack.duration || 1)) * 100)
  );
  const remainingSeconds = Math.max(0, currentTrack.duration - currentTrack.currentTime);

  return (
    <header className="w-full h-12 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#09090b] select-none z-40 font-sf relative">
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
              className="text-[9px] font-sf font-medium px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/20 text-white/80 transition-colors"
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

      {/* Center/Right: Touch-Friendly Media Pill (ONLY when Nav is active & media is playing) + Connectivity & Clock */}
      <div className="flex items-center space-x-2.5">
        {/* Media Pill Container with Anchor for Centered Popover */}
        {hasActiveMedia && navStatus !== 'idle' && (
          <div ref={pillRef} className="relative flex items-center">
            {/* Clickable Media Pill (No dot, clean artwork & text) */}
            <button
              type="button"
              onClick={() => setIsMediaPopoverOpen(!isMediaPopoverOpen)}
              className={`h-8 px-2.5 rounded-full border flex items-center space-x-2 transition-all active:scale-95 shadow-md ${
                isMediaPopoverOpen
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white/90'
              }`}
              title="Quick Media Controls"
            >
              {/* Album Thumbnail */}
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt="Art"
                  className="w-5 h-5 rounded-md object-cover border border-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/70">
                  <Volume2 className="w-3 h-3" />
                </div>
              )}

              {/* Track Title & Artist */}
              <span className="text-xs font-semibold text-white max-w-[110px] truncate">
                {currentTrack.title}
              </span>
            </button>

            {/* Floating Media Card directly centered beneath the pill (No full-screen blur) */}
            {isMediaPopoverOpen && (
              <>
                {/* Transparent Dismiss Click Layer (No blur, doesn't obscure map) */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsMediaPopoverOpen(false)}
                />

                {/* Popover matching exact MediaDockedCard visual DNA */}
                <div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LiquidGlassCard
                    padding="md"
                    className="w-full flex flex-col items-center text-center select-none font-sf shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Album Artwork */}
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl mt-0.5">
                      {currentTrack.artworkUrl ? (
                        <img
                          src={currentTrack.artworkUrl}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#181920] flex items-center justify-center text-2xl">
                          🐻
                        </div>
                      )}
                    </div>

                    {/* Track Title & Artist */}
                    <div className="flex flex-col items-center justify-center w-full px-2 mt-2.5 mb-1">
                      <span className="text-base font-bold text-white tracking-tight leading-snug truncate max-w-full">
                        {currentTrack.title}
                      </span>
                      <span className="text-xs text-white/50 font-normal mt-0.5 truncate max-w-full">
                        {currentTrack.artist}
                      </span>
                    </div>

                    {/* Progress Bar with Elapsed & Remaining Time */}
                    <div className="w-full px-1 my-1.5">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-sf tabular-nums text-white/40">
                        <span>{formatTime(currentTrack.currentTime)}</span>
                        <span>-{formatTime(remainingSeconds)}</span>
                      </div>
                    </div>

                    {/* Large Free-Floating Transport Controls */}
                    <div className="w-full flex items-center justify-center space-x-6 pt-1 pb-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          prevTrack();
                          setIsMediaPopoverOpen(false);
                        }}
                        aria-label="Previous Track"
                        className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                      >
                        <SkipBack className="w-5 h-5 fill-white/80" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          togglePlayPause();
                          setIsMediaPopoverOpen(false);
                        }}
                        aria-label={currentTrack.isPlaying ? 'Pause' : 'Play'}
                        className="text-white hover:text-white transition-transform active:scale-90 p-1.5"
                      >
                        {currentTrack.isPlaying ? (
                          <Pause className="w-7 h-7 fill-white" />
                        ) : (
                          <Play className="w-7 h-7 fill-white translate-x-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          nextTrack();
                          setIsMediaPopoverOpen(false);
                        }}
                        aria-label="Next Track"
                        className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                      >
                        <SkipForward className="w-5 h-5 fill-white/80" />
                      </button>
                    </div>
                  </LiquidGlassCard>
                </div>
              </>
            )}
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
