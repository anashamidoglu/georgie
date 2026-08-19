import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { MarqueeText } from '../common/MarqueeText';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(360);

  // Measure card container height to dynamically scale or remove artwork
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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

  // Original base idle size is 112px (w-28 h-28).
  // Fixed UI content (padding, text, scrubber, controls) takes ~190px.
  const BASE_ART_SIZE = 112;
  const MIN_ART_THRESHOLD = 56; // 50% of 112px
  const availableArtHeight = containerHeight - 190;
  const showArtwork = availableArtHeight >= MIN_ART_THRESHOLD;
  const currentArtSize = Math.min(BASE_ART_SIZE, Math.max(MIN_ART_THRESHOLD, availableArtHeight));

  return (
    <div ref={containerRef} className="w-full h-full">
      <LiquidGlassCard
        padding="none"
        className="w-full h-full p-4 sm:p-5 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
      >
        {/* Dynamic Album Artwork (Shrinks gracefully, hides if < 50% of idle size) */}
        {showArtwork && (
          <div
            style={{ width: `${currentArtSize}px`, height: `${currentArtSize}px` }}
            className="aspect-square rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl transition-all duration-200 mt-1"
          >
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
        )}

        {/* Centralized Track Title & Artist (with Smooth Marquee Loop for Long Names) */}
        <div className="flex flex-col items-center justify-center w-full px-2 my-auto flex-shrink-0 min-w-0">
          <MarqueeText
            text={track.title || 'No Track Playing'}
            className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug text-center"
            speed={12}
          />
          <MarqueeText
            text={track.artist || 'Connect Bluetooth'}
            className="text-xs sm:text-sm text-white/60 font-semibold mt-1 text-center"
            speed={15}
          />
        </div>

        {/* Progress Bar with Elapsed & Remaining Time */}
        <div className="w-full px-2 mb-2 mt-auto flex-shrink-0">
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

        {/* Big Centralized In-Car Transport Controls */}
        <div className="w-full flex items-center justify-center space-x-8 pt-1 pb-1 flex-shrink-0">
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
    </div>
  );
};
