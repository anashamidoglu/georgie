import React from 'react';
import { Play, Pause, Star, Loader2 } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useRadio } from '../../context/RadioContext';

export const RadioDockedCard: React.FC = () => {
  const {
    currentStation,
    isRadioPlaying,
    isRadioBuffering,
    toggleRadioPlayPause,
    toggleStationFavorite,
  } = useRadio();

  return (
    <div className="w-full h-full">
      <LiquidGlassCard
        padding="none"
        className="w-full h-full p-5 flex flex-col justify-between items-center text-center select-none font-sf overflow-hidden"
      >
        {/* Top Bar: Label & Favorite Star */}
        <div className="w-full flex items-center justify-between flex-shrink-0 px-2">
          <span className="text-xs font-semibold text-white/50 tracking-tight">
            FM Radio
          </span>

          <button
            type="button"
            onClick={() => toggleStationFavorite(currentStation.id)}
            className={`p-1.5 rounded-full transition-colors active:scale-90 ${
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
          <div className="flex items-baseline justify-center">
            <span className="text-5xl sm:text-6xl font-bold font-sf-display text-white tracking-tight tabular-nums leading-none">
              {currentStation.frequency}
            </span>
            <span className="text-sm font-bold text-white/40 ml-1.5 font-sf">
              MHz
            </span>
          </div>

          <span className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug mt-2 truncate max-w-full">
            {currentStation.name}
          </span>

          <span className="text-xs sm:text-sm text-white/55 font-medium mt-0.5 truncate max-w-full">
            {currentStation.category}
          </span>
        </div>

        {/* Big Centralized In-Car Transport Control */}
        <div className="w-full flex items-center justify-center pt-1 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={toggleRadioPlayPause}
            aria-label={isRadioPlaying ? 'Pause Radio' : 'Play Radio'}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:bg-white/95 active:scale-90 transition-transform flex-shrink-0"
          >
            {isRadioBuffering ? (
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            ) : isRadioPlaying ? (
              <Pause className="w-8 h-8 fill-black" />
            ) : (
              <Play className="w-8 h-8 fill-black translate-x-0.5" />
            )}
          </button>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
