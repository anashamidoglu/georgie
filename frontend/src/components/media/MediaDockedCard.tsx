import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useNav } from '../../context/NavContext';
import type { MediaTrack } from '../../types';

interface MediaDockedCardProps {
  track?: MediaTrack;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  variant?: 'hero' | 'compact' | 'auto';
}

export const MediaDockedCard: React.FC<MediaDockedCardProps> = ({
  track = {
    title: 'No Track Playing',
    artist: 'Connect Bluetooth to Stream',
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    artworkUrl: undefined,
  },
  onPlayPause,
  onNext,
  onPrev,
  variant = 'auto',
}) => {
  const { navStatus } = useNav();

  const isCompact =
    variant === 'compact' || (variant === 'auto' && navStatus !== 'idle');

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = track.duration > 0
    ? Math.min(100, (track.currentTime / track.duration) * 100)
    : 0;
  const remainingSeconds = Math.max(0, track.duration - track.currentTime);

  // ==========================================
  // 1. COMPACT HORIZONTAL LAYOUT (Nav Split View)
  // ==========================================
  if (isCompact) {
    return (
      <LiquidGlassCard
        padding="none"
        className="w-full h-full p-4 sm:p-5 flex flex-col justify-between select-none font-sf overflow-hidden"
      >
        {/* Top Row: Prominent Album Art + Title/Artist + Animated Equalizer */}
        <div className="flex items-center space-x-4 w-full flex-shrink-0">
          {/* Album Art */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl">
            {track.artworkUrl ? (
              <img
                src={track.artworkUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#181920] flex items-center justify-center">
                <span className="text-3xl leading-none">🐻</span>
              </div>
            )}
          </div>

          {/* Track Details */}
          <div className="flex flex-col justify-center min-w-0 flex-1 text-left">
            <span className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate">
              {track.title}
            </span>
            <span className="text-xs sm:text-sm text-white/60 font-semibold truncate mt-1">
              {track.artist}
            </span>

            {/* Equalizer Waveform Indicator */}
            {track.isPlaying && (
              <div className="flex items-end space-x-1 h-4 mt-2" title="Playing">
                <span className="w-1 bg-rose-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3" />
                <span className="w-1 bg-rose-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s] h-4" />
                <span className="w-1 bg-rose-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s] h-2.5" />
                <span className="w-1 bg-rose-400 rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.1s] h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Middle Row: Scrubber & Timestamps */}
        <div className="w-full my-auto py-1 flex-shrink-0">
          <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-bold font-sf tabular-nums text-white/50">
            <span>{formatTime(track.currentTime)}</span>
            <span>{track.duration > 0 ? `-${formatTime(remainingSeconds)}` : '0:00'}</span>
          </div>
        </div>

        {/* Bottom Row: Big Tactile In-Car Transport Controls */}
        <div className="w-full flex items-center justify-center space-x-8 flex-shrink-0 pt-1 pb-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous Track"
            className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
          >
            <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-white/80" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            aria-label={track.isPlaying ? 'Pause' : 'Play'}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:bg-white/95 active:scale-90 transition-transform flex-shrink-0"
          >
            {track.isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-black" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next Track"
            className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
          >
            <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-white/80" />
          </button>
        </div>
      </LiquidGlassCard>
    );
  }

  // ==========================================
  // 2. HERO CENTERED LAYOUT (Home Dashboard Idle)
  // ==========================================
  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full p-4 sm:p-5 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
    >
      {/* Top: Generous High-Res Album Artwork */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 max-h-[38%] aspect-square rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink flex items-center justify-center shadow-2xl mt-1">
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#181920] flex flex-col items-center justify-center p-2">
            <span className="text-4xl leading-none">🐻</span>
          </div>
        )}
      </div>

      {/* Middle: Prominent Track Title & Artist */}
      <div className="flex flex-col items-center justify-center w-full px-3 mt-3 mb-1.5 flex-shrink-0 min-w-0">
        <span className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug truncate max-w-full">
          {track.title}
        </span>
        <span className="text-xs sm:text-sm text-white/60 font-semibold mt-1 truncate max-w-full">
          {track.artist}
        </span>
      </div>

      {/* Progress Bar with Elapsed & Remaining Time */}
      <div className="w-full px-3 mb-3 mt-1 flex-shrink-0">
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-bold font-sf tabular-nums text-white/50">
          <span>{formatTime(track.currentTime)}</span>
          <span>{track.duration > 0 ? `-${formatTime(remainingSeconds)}` : '0:00'}</span>
        </div>
      </div>

      {/* Bottom: Big Tactile In-Car Transport Controls */}
      <div className="w-full flex items-center justify-center space-x-8 pt-1 pb-1 flex-shrink-0 mt-auto">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
        >
          <SkipBack className="w-8 h-8 fill-white/80" />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          aria-label={track.isPlaying ? 'Pause' : 'Play'}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:bg-white/95 active:scale-90 transition-transform flex-shrink-0"
        >
          {track.isPlaying ? (
            <Pause className="w-7 h-7 fill-black" />
          ) : (
            <Play className="w-7 h-7 fill-black translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
        >
          <SkipForward className="w-8 h-8 fill-white/80" />
        </button>
      </div>
    </LiquidGlassCard>
  );
};
