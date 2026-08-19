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
      className="w-full h-full p-3.5 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
    >
      {/* Top: Compact Sleek Album Artwork (Leaves ample breathing room for UX) */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl mt-0.5">
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

      {/* Middle: Big, Bold, Driver-Readable Track Title & Artist */}
      <div className="flex flex-col items-center justify-center w-full px-2 my-0.5 flex-shrink-0 min-w-0">
        <span className="text-lg font-bold text-white tracking-tight leading-tight truncate max-w-full">
          {track.title}
        </span>
        <span className="text-xs text-white/60 font-semibold mt-0.5 truncate max-w-full">
          {track.artist}
        </span>
      </div>

      {/* Progress Bar with Elapsed & Remaining Time */}
      <div className="w-full px-2 my-0.5 flex-shrink-0">
        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mb-1">
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
      <div className="w-full flex items-center justify-center space-x-8 pt-1 pb-1 flex-shrink-0">
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
          <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-white/80" />
        </button>
      </div>
    </LiquidGlassCard>
  );
};
