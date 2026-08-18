import React, { useState } from 'react';
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
    title: 'LoveFrom,',
    artist: 'California',
    duration: 215,
    currentTime: 45,
    isPlaying: true,
    artworkUrl: null,
  },
  onPlayPause,
  onNext,
  onPrev,
}) => {
  const [isPlaying, setIsPlaying] = useState(track.isPlaying);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (track.currentTime / track.duration) * 100);
  const remainingSeconds = Math.max(0, track.duration - track.currentTime);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    onPlayPause?.();
  };

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full h-full flex flex-col justify-between items-center text-center select-none font-sf"
    >
      {/* Top: Large Prominent Album Artwork */}
      <div className="w-28 h-28 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl mt-1">
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

      {/* Middle: Much Bigger Track Title & Artist */}
      <div className="flex flex-col items-center justify-center w-full px-3 my-1">
        <span className="text-xl font-bold text-white tracking-tight leading-tight truncate max-w-full">
          {track.title}
        </span>
        <span className="text-sm text-white/50 font-normal mt-1 truncate max-w-full">
          {track.artist}
        </span>
      </div>

      {/* Progress Bar with Elapsed & Remaining Time */}
      <div className="w-full px-2 my-1">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-sf tabular-nums text-white/40">
          <span>{formatTime(track.currentTime)}</span>
          <span>-{formatTime(remainingSeconds)}</span>
        </div>
      </div>

      {/* Bottom: Large Tactile Transport Controls for Driving Accessibility */}
      <div className="w-full flex items-center justify-center space-x-8 pb-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
        >
          <SkipBack className="w-7 h-7 fill-white/80" />
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="text-white hover:text-white transition-transform active:scale-90 p-2"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-white" />
          ) : (
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next Track"
          className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
        >
          <SkipForward className="w-7 h-7 fill-white/80" />
        </button>
      </div>
    </LiquidGlassCard>
  );
};
