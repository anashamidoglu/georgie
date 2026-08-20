import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Star, Radio, Smartphone, Loader2 } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useRadio } from '../../context/RadioContext';

interface RadioDockedCardProps {
  onSwitchToBluetooth?: () => void;
}

export const RadioDockedCard: React.FC<RadioDockedCardProps> = ({ onSwitchToBluetooth }) => {
  const {
    stations,
    currentStation,
    isRadioPlaying,
    isRadioBuffering,
    playStation,
    toggleRadioPlayPause,
    nextStation,
    prevStation,
    toggleStationFavorite,
    setActiveSource,
  } = useRadio();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(300);

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

  const isCompact = containerHeight < 240;

  return (
    <div ref={containerRef} className="w-full h-full">
      <LiquidGlassCard
        padding="none"
        className="w-full h-full p-4 sm:p-5 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
      >
        {/* Top: Source Switcher & Favorite Star */}
        <div className="w-full flex items-center justify-between flex-shrink-0 px-1">
          {/* Apple Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-full bg-white/[0.08] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveSource('bluetooth');
                onSwitchToBluetooth?.();
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold text-white/50 hover:text-white transition-colors flex items-center space-x-1.5 active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bluetooth</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSource('radio')}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white text-black transition-all flex items-center space-x-1.5 shadow-md"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radio</span>
            </button>
          </div>

          {/* Favorite Toggle */}
          <button
            type="button"
            onClick={() => toggleStationFavorite(currentStation.id)}
            className={`p-2 rounded-full transition-colors active:scale-90 ${
              currentStation.isFavorite
                ? 'text-amber-400 bg-amber-400/15'
                : 'text-white/30 hover:text-white hover:bg-white/10'
            }`}
            title={currentStation.isFavorite ? 'Remove Favorite' : 'Save Station'}
          >
            <Star className={`w-4 h-4 ${currentStation.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Center Hero: Station Frequency & Details */}
        <div className="flex flex-col items-center justify-center w-full px-2 my-auto flex-shrink-0 min-w-0">
          {/* Large Clean Frequency */}
          <div className="flex items-baseline justify-center">
            <span className="text-4xl sm:text-5xl font-bold font-sf-display text-white tracking-tight tabular-nums leading-none">
              {currentStation.frequency}
            </span>
            <span className="text-sm font-bold text-white/40 ml-1.5 font-sf">
              MHz
            </span>
          </div>

          {/* Station Name */}
          <span className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug mt-1.5 truncate max-w-full">
            {currentStation.name}
          </span>

          {/* Category / Genre */}
          {!isCompact && (
            <span className="text-xs text-white/55 font-medium mt-0.5 truncate max-w-full">
              {currentStation.category}
            </span>
          )}
        </div>

        {/* Preset Stations Quick-Pills */}
        {!isCompact && (
          <div className="w-full overflow-x-auto scrollbar-none py-1 flex items-center space-x-1.5 px-1 flex-shrink-0">
            {stations.map((st) => {
              const isCurrent = st.id === currentStation.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => playStation(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                    isCurrent
                      ? 'bg-white/20 text-white border border-white/30 font-bold'
                      : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{st.frequency} {st.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Big Centralized In-Car Transport Controls */}
        <div className="w-full flex items-center justify-center space-x-8 pt-1 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={prevStation}
            aria-label="Previous Station"
            className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
          >
            <SkipBack className="w-8 h-8 fill-white/80" />
          </button>

          <button
            type="button"
            onClick={toggleRadioPlayPause}
            aria-label={isRadioPlaying ? 'Pause Radio' : 'Play Radio'}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:bg-white/95 active:scale-90 transition-transform flex-shrink-0"
          >
            {isRadioBuffering ? (
              <Loader2 className="w-7 h-7 animate-spin text-black" />
            ) : isRadioPlaying ? (
              <Pause className="w-7 h-7 fill-black" />
            ) : (
              <Play className="w-7 h-7 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={nextStation}
            aria-label="Next Station"
            className="text-white/70 hover:text-white transition-transform active:scale-90 p-2"
          >
            <SkipForward className="w-8 h-8 fill-white/80" />
          </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
