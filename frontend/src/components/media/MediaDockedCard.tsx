import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import type { MediaTrack } from '../../types';

interface MediaDockedCardProps {
  track?: MediaTrack;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
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
}) => {
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

  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full p-3 sm:p-4 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
    >
      {/* Top: Dynamic Scaling Album Artwork (Never pushes content off-screen) */}
      <div className="flex-1 min-h-[64px] max-h-[112px] aspect-square rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex items-center justify-center shadow-xl my-auto flex-shrink">
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#181920] flex flex-col items-center justify-center p-2">
            <span className="text-3xl leading-none">🐻</span>
          </div>
        )}
      </div>

      {/* Middle: Dynamic Track Title & Artist */}
      <div className="flex flex-col items-center justify-center w-full px-2 my-1 flex-shrink-0 min-w-0">
        <span className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight truncate max-w-full">
          {track.title}
        </span>
        <span className="text-xs text-white/50 font-medium mt-0.5 truncate max-w-full">
          {track.artist}
        </span>
      </div>

      {/* Progress Bar with Elapsed & Remaining Time */}
      <div className="w-full px-1 my-1 flex-shrink-0">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] sm:text-xs font-sf tabular-nums text-white/40 font-medium">
          <span>{formatTime(track.currentTime)}</span>
          <span>{track.duration > 0 ? `-${formatTime(remainingSeconds)}` : '0:00'}</span>
        </div>
      </div>

      {/* Bottom: Fixed Visible Tactile Transport Controls */}
      <div className="w-full flex items-center justify-center space-x-6 pt-0.5 pb-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
        >
          <SkipBack className="w-6 h-6 fill-white/80" />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          aria-label={track.isPlaying ? 'Pause' : 'Play'}
          className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-white/90 active:scale-90 transition-transform flex-shrink-0"
        >
          {track.isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-1.5"
        >
          <SkipForward className="w-6 h-6 fill-white/80" />
        </button>
      </div>
    </LiquidGlassCard>
  );
};
