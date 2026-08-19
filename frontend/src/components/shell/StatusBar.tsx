import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Bluetooth,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sliders,
} from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';
import { useMedia } from '../../context/MediaContext';
import { NavDevToolsModal } from '../nav/NavDevToolsModal';
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
  const [isDevToolsOpen, setIsDevToolsOpen] = useState<boolean>(false);
  const pillRef = useRef<HTMLDivElement | null>(null);

  const { navStatus } = useNav();

  const {
    hasActiveMedia,
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
    <>
      <header className="w-full h-12 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#09090b] select-none z-40 font-sf relative">
        {/* Left: Modern Unified Dev Tools Trigger */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsDevToolsOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all text-xs font-semibold"
            title="Open Nav & Simulation Dev Tools"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Dev Tools</span>
            {navStatus !== 'idle' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 animate-pulse" />
            )}
          </button>
        </div>

        {/* Right: Media Pill + Connectivity + Live Clock */}
        <div className="flex items-center space-x-3">
          {/* Media Pill Container with Anchor for Centered Popover */}
          {hasActiveMedia && navStatus !== 'idle' && (
            <div ref={pillRef} className="relative flex items-center">
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
                <img
                  src={currentTrack.artworkUrl || undefined}
                  alt={currentTrack.album}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
                <span className="text-xs font-medium max-w-[130px] truncate">
                  {currentTrack.title}
                </span>
              </button>

              {/* Centered Media Player Popover */}
              {isMediaPopoverOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMediaPopoverOpen(false)}
                  />

                  <div className="absolute top-full mt-2 -right-8 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <LiquidGlassCard
                      padding="md"
                      className="w-[280px] p-4 flex flex-col space-y-3 font-sf select-none bg-[#12131a]/95 border-white/20 shadow-2xl backdrop-blur-2xl"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={currentTrack.artworkUrl || undefined}
                          alt={currentTrack.album}
                          className="w-12 h-12 rounded-xl object-cover shadow-md flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold text-white truncate">
                            {currentTrack.title}
                          </span>
                          <span className="text-xs font-medium text-white/60 truncate mt-0.5">
                            {currentTrack.artist}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40 font-mono">
                          <span>{formatTime(currentTrack.currentTime)}</span>
                          <span>-{formatTime(remainingSeconds)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-4 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevTrack();
                          }}
                          aria-label="Previous Track"
                          className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
                        >
                          <SkipBack className="w-5 h-5 fill-white/80" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                          }}
                          aria-label={currentTrack.isPlaying ? 'Pause' : 'Play'}
                          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-transform active:scale-90 shadow-md hover:bg-white/90"
                        >
                          {currentTrack.isPlaying ? (
                            <Pause className="w-5 h-5 fill-black" />
                          ) : (
                            <Play className="w-5 h-5 fill-black translate-x-0.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextTrack();
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

          {/* Live SF Pro Clock (12-hour format) */}
          <div className="flex items-baseline space-x-1.5 text-right">
            <span className="text-[11px] text-white/40 font-medium tracking-wide uppercase">
              {dateStr}
            </span>
            <span className="text-base font-semibold text-white tabular-nums tracking-normal">
              {timeStr || '12:00 PM'}
            </span>
          </div>
        </div>
      </header>

      {/* Modern Dev Tools Modal */}
      <NavDevToolsModal
        isOpen={isDevToolsOpen}
        onClose={() => setIsDevToolsOpen(false)}
      />
    </>
  );
};
