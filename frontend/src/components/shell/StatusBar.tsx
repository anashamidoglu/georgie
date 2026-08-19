import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Bluetooth,
  StepForward,
  StepBack,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  RotateCcw,
  MapPin,
  Phone,
} from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';
import { useMedia } from '../../context/MediaContext';
import { useCall } from '../../context/CallContext';
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
    isNavExpanded,
    navStatus,
    allSteps,
    activeStepIndex,
    nextSimulationStep,
    prevSimulationStep,
    simulateOffRoute,
    resetSimulatedPosition,
  } = useNav();

  const {
    hasActiveMedia,
    currentTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
  } = useMedia();

  const { simulateIncomingCall } = useCall();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTimeStr(`${hours}:${minutes} ${period}`);

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const day = days[now.getDay()];
      const date = now.getDate();
      setDateStr(`${day} ${date}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close media popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setIsMediaPopoverOpen(false);
      }
    };

    if (isMediaPopoverOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMediaPopoverOpen]);

  // Format track duration seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = currentTrack.duration > 0
    ? Math.min(100, Math.max(0, (currentTrack.currentTime / currentTrack.duration) * 100))
    : 0;
  const remainingSeconds = Math.max(0, currentTrack.duration - currentTrack.currentTime);

  const shouldShowMediaPill =
    hasActiveMedia &&
    (isNavExpanded || navStatus !== 'idle') &&
    Boolean(currentTrack.title && currentTrack.title !== 'No Track Playing');

  return (
    <header className="w-full h-12 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#09090b] select-none z-40 font-sf relative">
      {/* Left: Navigation Simulator, Miss Turn, and Phone Call Dev Tools */}
      <div className="flex items-center space-x-2">
        {/* Driving Step Simulator (Active when a route is active) */}
        {allSteps.length > 0 && (
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

        {/* Miss Turn & Reset Position (Active during navigation) */}
        {navStatus !== 'idle' && (
          <div className="flex items-center space-x-1.5 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={simulateOffRoute}
              className="text-[9px] font-sf font-semibold px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center space-x-1 transition-colors active:scale-95"
              title="Simulate driving past turn / missing turn to trigger dynamic rerouting"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Miss Turn</span>
            </button>

            <button
              type="button"
              onClick={resetSimulatedPosition}
              className="text-[9px] font-sf font-medium px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 flex items-center space-x-1 transition-colors"
              title="Snap vehicle puck back to current turn"
            >
              <MapPin className="w-2.5 h-2.5" />
              <span>Reset Pos</span>
            </button>
          </div>
        )}

        {/* Simulate Incoming Call Dev Trigger */}
        <button
          type="button"
          onClick={() => simulateIncomingCall('Sarah', '+971 50 123 4567')}
          className="text-[9px] font-sf font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 transition-colors active:scale-95"
          title="Simulate incoming call from Sarah"
        >
          <Phone className="w-2.5 h-2.5 fill-current" />
          <span>Test Call</span>
        </button>
      </div>

      {/* Center/Right: Touch-Friendly Media Pill + Connectivity & Clock */}
      <div className="flex items-center space-x-2.5">
        {/* Media Pill Container with Anchor for Popover */}
        {shouldShowMediaPill && (
          <div ref={pillRef} className="relative flex items-center">
            {/* Clickable Media Pill */}
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

              {/* Title & Artist */}
              <div className="flex flex-col text-left max-w-[110px] min-w-0 font-sf">
                <span className="text-[11px] font-semibold text-white truncate leading-tight">
                  {currentTrack.title || 'No Media'}
                </span>
                <span className="text-[9px] text-white/50 truncate leading-tight">
                  {currentTrack.artist || 'Unknown'}
                </span>
              </div>
            </button>

            {/* Media Popover Styled Identically to MediaDockedCard */}
            {isMediaPopoverOpen && (
              <div
                className="absolute top-11 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{ width: '260px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <LiquidGlassCard
                  padding="md"
                  className="rounded-3xl border border-white/20 shadow-2xl bg-[#090a0f]/95 backdrop-blur-2xl p-5 font-sf flex flex-col items-center text-center select-none space-y-3"
                >
                  {/* Top: Prominent Album Artwork with 🐻 fallback */}
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl mt-0.5">
                    {currentTrack.artworkUrl ? (
                      <img
                        src={currentTrack.artworkUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#181920] flex flex-col items-center justify-center p-2">
                        <span className="text-3xl leading-none">🐻</span>
                      </div>
                    )}
                  </div>

                  {/* Middle: Title & Artist */}
                  <div className="flex flex-col items-center justify-center w-full px-2">
                    <span className="text-base font-bold text-white tracking-tight leading-tight truncate max-w-full">
                      {currentTrack.title || 'Not Playing'}
                    </span>
                    <span className="text-xs text-white/50 font-normal mt-0.5 truncate max-w-full">
                      {currentTrack.artist || 'Unknown Artist'}
                    </span>
                  </div>

                  {/* Progress Bar & Timestamps */}
                  <div className="w-full px-1">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-sf tabular-nums text-white/40">
                      <span>{formatTime(currentTrack.currentTime)}</span>
                      <span>{currentTrack.duration > 0 ? `-${formatTime(remainingSeconds)}` : '0:00'}</span>
                    </div>
                  </div>

                  {/* Bottom: Tactile Transport Controls */}
                  <div className="w-full flex items-center justify-center space-x-6 pt-0.5 pb-0.5">
                    <button
                      type="button"
                      onClick={prevTrack}
                      aria-label="Previous Track"
                      className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      <SkipBack className="w-5 h-5 fill-white/80" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayPause}
                      aria-label={currentTrack.isPlaying ? 'Pause' : 'Play'}
                      className="text-white hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      {currentTrack.isPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white translate-x-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={nextTrack}
                      aria-label="Next Track"
                      className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      <SkipForward className="w-5 h-5 fill-white/80" />
                    </button>
                  </div>
                </LiquidGlassCard>
              </div>
            )}
          </div>
        )}

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
        <div className="flex items-center space-x-2 font-sf">
          <span className="text-xs font-semibold text-white/50 tracking-wider">
            {dateStr || 'WED 19'}
          </span>
          <span className="text-sm font-bold text-white tabular-nums tracking-tight">
            {timeStr || '12:00 PM'}
          </span>
        </div>
      </div>
    </header>
  );
};
