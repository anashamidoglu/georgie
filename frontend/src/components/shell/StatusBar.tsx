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
  Music,
} from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';
import { useMedia } from '../../context/MediaContext';
import { useCall } from '../../context/CallContext';
import { useRadio } from '../../context/RadioContext';
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

  const {
    activeSource,
    currentStation,
    isRadioPlaying,
    isRadioBuffering,
    toggleRadioPlayPause,
    nextStation,
    prevStation,
  } = useRadio();

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
    (isNavExpanded || navStatus !== 'idle') &&
    (activeSource === 'radio'
      ? isRadioPlaying || isRadioBuffering
      : hasActiveMedia && Boolean(currentTrack.title && currentTrack.title !== 'No Track Playing'));

  const pillTitle = activeSource === 'radio' ? currentStation.name : currentTrack.title || 'No Media';
  const pillSubtitle = activeSource === 'radio' ? `${currentStation.frequency} MHz` : currentTrack.artist || 'Unknown';

  return (
    <header className="w-full h-14 px-5 flex items-center justify-between border-b border-white/[0.08] bg-[#09090b] select-none z-40 font-sf relative">
      {/* Left: Navigation Simulator, Miss Turn, and Phone Call Dev Tools */}
      <div className="flex items-center space-x-2.5">
        {/* Driving Step Simulator (Active when a route is active) */}
        {allSteps.length > 0 && (
          <div className="flex items-center space-x-1.5 bg-sky-500/15 px-3 py-1 rounded-full border border-sky-500/40 animate-in fade-in duration-150">
            <span className="text-xs font-bold text-sky-200 font-sf mr-1 tabular-nums">
              Step {activeStepIndex + 1}/{allSteps.length}
            </span>
            <button
              type="button"
              onClick={prevSimulationStep}
              disabled={activeStepIndex === 0}
              aria-label="Previous step"
              className="p-1 rounded-full hover:bg-sky-500/30 text-sky-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Turn"
            >
              <StepBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextSimulationStep}
              disabled={activeStepIndex === allSteps.length - 1}
              aria-label="Next step"
              className="p-1 rounded-full hover:bg-sky-500/30 text-sky-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Turn"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Miss Turn / Dynamic Off-Route Simulation Button */}
        {navStatus === 'navigating' && (
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={simulateOffRoute}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-colors shadow-sm"
              title="Simulate driver missing a turn to trigger dynamic rerouting"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Miss Turn</span>
            </button>

            <button
              type="button"
              onClick={resetSimulatedPosition}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white transition-colors"
              title="Reset vehicle position back to GPS"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Incoming Call Tester Button */}
        <button
          type="button"
          onClick={() => simulateIncomingCall('Mom', '+971 50 123 4567')}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold transition-colors shadow-sm"
          title="Simulate incoming Bluetooth Hands-Free call"
        >
          <Phone className="w-3.5 h-3.5 text-rose-300" />
          <span>Test Call</span>
        </button>
      </div>

      {/* Center/Right: Touch-Friendly Media Pill + Connectivity & Clock */}
      <div className="flex items-center space-x-3.5">
        {/* Media Pill Container with Anchor for Popover */}
        {shouldShowMediaPill && (
          <div ref={pillRef} className="relative flex items-center">
            {/* Clickable Media Pill */}
            <button
              type="button"
              onClick={() => setIsMediaPopoverOpen(!isMediaPopoverOpen)}
              className={`h-9 px-3 rounded-full border flex items-center space-x-2.5 transition-all active:scale-95 shadow-lg ${
                isMediaPopoverOpen
                  ? 'bg-white/25 border-white/40 text-white'
                  : 'bg-white/[0.09] hover:bg-white/[0.16] border-white/20 text-white'
              }`}
              title="Quick Media Controls"
            >
              {/* Album / Radio Thumbnail */}
              {activeSource === 'radio' ? (
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  <Music className="w-3.5 h-3.5" />
                </div>
              ) : currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt="Art"
                  className="w-6 h-6 rounded-lg object-cover border border-white/15 flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/80 flex-shrink-0">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Title & Subtitle */}
              <div className="flex flex-col text-left max-w-[130px] min-w-0 font-sf">
                <span className="text-xs font-bold text-white truncate leading-tight">
                  {pillTitle}
                </span>
                <span className="text-[10px] text-white/60 font-medium truncate leading-tight">
                  {pillSubtitle}
                </span>
              </div>
            </button>

            {/* Media Popover */}
            {isMediaPopoverOpen && (
              <div
                className="absolute top-12 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{ width: '280px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <LiquidGlassCard
                  padding="md"
                  className="rounded-3xl border border-white/20 shadow-2xl bg-[#090a0f]/95 backdrop-blur-2xl p-5 font-sf flex flex-col items-center text-center select-none space-y-3.5"
                >
                  {/* Top: Artwork / Radio Frequency Emblem */}
                  <div className="w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex flex-col items-center justify-center shadow-2xl mt-0.5">
                    {activeSource === 'radio' ? (
                      <div className="w-full h-full bg-[#15161e] flex flex-col items-center justify-center p-2">
                        <span className="text-2xl font-bold font-sf-display text-white tabular-nums leading-none">
                          {currentStation.frequency}
                        </span>
                        <span className="text-[11px] font-bold text-white/40 mt-0.5">MHz</span>
                      </div>
                    ) : currentTrack.artworkUrl ? (
                      <img
                        src={currentTrack.artworkUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#181920] flex flex-col items-center justify-center p-2">
                        <Music className="w-10 h-10 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Middle: Title & Artist / Station Details */}
                  <div className="flex flex-col items-center justify-center w-full px-2">
                    <span className="text-lg font-bold text-white tracking-tight leading-tight truncate max-w-full">
                      {activeSource === 'radio' ? currentStation.name : currentTrack.title || 'Not Playing'}
                    </span>
                    <span className="text-sm text-white/60 font-medium mt-0.5 truncate max-w-full">
                      {activeSource === 'radio' ? currentStation.category : currentTrack.artist || 'Unknown Artist'}
                    </span>
                  </div>

                  {/* Progress Bar & Timestamps (Bluetooth tracks only when duration exists) */}
                  {activeSource === 'bluetooth' && currentTrack.duration > 0 && (
                    <div className="w-full px-1">
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold font-sf tabular-nums text-white/50">
                        <span>{formatTime(currentTrack.currentTime)}</span>
                        <span>-{formatTime(remainingSeconds)}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom: Tactile Transport Controls */}
                  <div className="w-full flex items-center justify-center space-x-7 pt-1 pb-0.5">
                    <button
                      type="button"
                      onClick={activeSource === 'radio' ? prevStation : prevTrack}
                      aria-label="Previous"
                      className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      <SkipBack className="w-6 h-6 fill-white/80" />
                    </button>

                    <button
                      type="button"
                      onClick={activeSource === 'radio' ? toggleRadioPlayPause : togglePlayPause}
                      aria-label="Play/Pause"
                      className="text-white hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      {activeSource === 'radio' ? (
                        isRadioBuffering ? (
                          <span className="text-xs font-bold text-white/70">...</span>
                        ) : isRadioPlaying ? (
                          <Pause className="w-7 h-7 fill-white" />
                        ) : (
                          <Play className="w-7 h-7 fill-white translate-x-0.5" />
                        )
                      ) : currentTrack.isPlaying ? (
                        <Pause className="w-7 h-7 fill-white" />
                      ) : (
                        <Play className="w-7 h-7 fill-white translate-x-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={activeSource === 'radio' ? nextStation : nextTrack}
                      aria-label="Next"
                      className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                    >
                      <SkipForward className="w-6 h-6 fill-white/80" />
                    </button>
                  </div>
                </LiquidGlassCard>
              </div>
            )}
          </div>
        )}

        {/* Connectivity Status */}
        <div className="flex items-center space-x-2.5 text-white/60">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/[0.10] text-white tracking-tight">
            {connectivity.cellular}
          </span>
          {connectivity.wifi && (
            <Wifi className="w-4 h-4 text-white" />
          )}
          {connectivity.bluetooth && (
            <Bluetooth className="w-4 h-4 text-sky-400" />
          )}
        </div>

        <div className="h-4 w-[1px] bg-white/15" />

        {/* Live SF Pro Clock */}
        <div className="flex items-center space-x-2.5 font-sf">
          <span className="text-xs font-bold text-white/50 tracking-wider">
            {dateStr || 'WED 19'}
          </span>
          <span className="text-base font-bold font-sf-display text-white tabular-nums tracking-tight">
            {timeStr || '12:00 PM'}
          </span>
        </div>
      </div>
    </header>
  );
};
