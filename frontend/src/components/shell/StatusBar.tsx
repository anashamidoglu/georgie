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
  AlertTriangle,
  RotateCcw,
  MapPin,
} from 'lucide-react';
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
    allSteps,
    activeStepIndex,
    nextSimulationStep,
    prevSimulationStep,
    simulateIncidentAlert,
    simulateOffRoute,
    resetSimulatedPosition,
  } = useNav();

  const {
    hasActiveMedia,
    setHasActiveMedia,
    currentTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
  } = useMedia();

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
      {/* Left: Navigation Dev & Simulation Testing Suite */}
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

        {/* Direct Dev Testing Buttons (Only when navigating/testing) */}
        {navStatus !== 'idle' && (
          <div className="flex items-center space-x-1.5 animate-in fade-in duration-150">
            {/* Trigger Test Incident Banner */}
            <button
              type="button"
              onClick={simulateIncidentAlert}
              className="text-[9px] font-sf font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 flex items-center space-x-1 transition-colors"
              title="Trigger test incident alert banner (8s auto-dismiss countdown)"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Test Incident</span>
            </button>

            {/* Trigger Missed Turn / Off-Route */}
            <button
              type="button"
              onClick={simulateOffRoute}
              className="text-[9px] font-sf font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center space-x-1 transition-colors"
              title="Shift coordinates to test off-route auto-rerouting"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Test Off-Route</span>
            </button>

            {/* Reset Vehicle Puck */}
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
      </div>

      {/* Center/Right: Touch-Friendly Media Pill + Connectivity & Clock */}
      <div className="flex items-center space-x-2.5">
        {/* Media Pill Container with Anchor for Centered Popover */}
        {hasActiveMedia && navStatus !== 'idle' && (
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

            {/* Centered Media Controls Popover */}
            {isMediaPopoverOpen && (
              <div
                className="absolute top-10 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{ width: '280px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <LiquidGlassCard
                  padding="md"
                  className="rounded-2xl border border-white/20 shadow-2xl bg-black/95 backdrop-blur-xl p-4 font-sf flex flex-col space-y-3"
                >
                  {/* Track Header with Art */}
                  <div className="flex items-center space-x-3">
                    {currentTrack.artworkUrl ? (
                      <img
                        src={currentTrack.artworkUrl}
                        alt="Album Art"
                        className="w-12 h-12 rounded-lg object-cover border border-white/10 flex-shrink-0 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white/40">
                        <Volume2 className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate">
                        {currentTrack.title || 'Not Playing'}
                      </span>
                      <span className="text-xs text-white/60 truncate">
                        {currentTrack.artist || 'Unknown Artist'}
                      </span>
                      <span className="text-[10px] text-white/40 truncate">
                        {currentTrack.album || 'Unknown Album'}
                      </span>
                    </div>
                  </div>

                  {/* Scrub Bar & Timestamps */}
                  <div className="flex flex-col space-y-1">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full transition-all duration-200"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                      <span>{formatTime(currentTrack.currentTime)}</span>
                      <span>-{formatTime(remainingSeconds)}</span>
                    </div>
                  </div>

                  {/* Media Controls (Previous, Play/Pause, Next) */}
                  <div className="flex items-center justify-center space-x-4 pt-1">
                    <button
                      type="button"
                      onClick={prevTrack}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      title="Previous Track"
                    >
                      <SkipBack className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                      title={currentTrack.isPlaying ? 'Pause' : 'Play'}
                    >
                      {currentTrack.isPlaying ? (
                        <Pause className="w-4 h-4 fill-black" />
                      ) : (
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={nextTrack}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      title="Next Track"
                    >
                      <SkipForward className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </LiquidGlassCard>
              </div>
            )}
          </div>
        )}

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
