import React from 'react';
import { NavDockedViewport } from '../components/nav/NavDockedViewport';
import { NavPreviewCard } from '../components/nav/NavPreviewCard';
import { DateTimeCard } from '../components/common/DateTimeCard';
import { MediaDockedCard } from '../components/media/MediaDockedCard';
import { UpcomingManeuversCard } from '../components/nav/UpcomingManeuversCard';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Music, PlusCircle, MapPin } from 'lucide-react';
import { useNav } from '../context/NavContext';
import { useMedia } from '../context/MediaContext';

export const DashboardView: React.FC = () => {
  const {
    isNavExpanded,
    navStatus,
    destinationName,
    inspectedStep,
  } = useNav();

  const {
    hasActiveMedia,
    setHasActiveMedia,
    currentTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
  } = useMedia();

  return (
    <div className="w-full h-full p-3.5 relative overflow-hidden flex flex-col justify-between max-h-full">
      {/* Main Grid: Left Primary Map vs Right Stacked Cards (min-h-0 & overflow-hidden prevent grid blowout) */}
      <div className="w-full h-full min-h-0 max-h-full grid grid-cols-12 gap-3.5 items-stretch overflow-hidden">
        {/* Left Column: Navigation Docked / Expanded Viewport */}
        <div
          className={`h-full min-h-0 max-h-full overflow-hidden transition-all duration-300 ${
            isNavExpanded ? 'col-span-12' : 'col-span-7'
          }`}
        >
          <NavDockedViewport />
        </div>

        {/* Right Column: Stacked Turn/Date Card & Media/Turns/Placeholder */}
        {!isNavExpanded && (
          <div className="col-span-5 h-full min-h-0 max-h-full flex flex-col space-y-3.5 overflow-hidden transition-all duration-300">
            {/* Top Right: Active Turn (Navigating OR Step Preview) OR Destination Card OR Free-sitting Date/Time */}
            <div className="flex-shrink-0">
              {navStatus === 'navigating' || inspectedStep !== null ? (
                <NavPreviewCard />
              ) : navStatus === 'preview' ? (
                <LiquidGlassCard padding="lg" className="w-full flex items-center select-none font-sf">
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Destination
                      </span>
                      <span className="text-lg font-bold font-sf-display text-white truncate max-w-[210px] mt-0.5">
                        {destinationName || 'Pinned Location'}
                      </span>
                    </div>
                  </div>
                </LiquidGlassCard>
              ) : (
                <DateTimeCard />
              )}
            </div>

            {/* Bottom Right: Media Card OR Upcoming Steps (if Nav active) OR Clean Placeholder (if Nav idle) */}
            <div className="flex-1 min-h-0 max-h-full flex flex-col overflow-hidden">
              {hasActiveMedia ? (
                <MediaDockedCard
                  track={currentTrack}
                  onPlayPause={togglePlayPause}
                  onNext={nextTrack}
                  onPrev={prevTrack}
                />
              ) : navStatus !== 'idle' ? (
                /* When Nav is preview/active and no media is playing -> Full Upcoming Steps list */
                <UpcomingManeuversCard />
              ) : (
                /* When Nav is idle and no media is playing -> Clean audio placeholder */
                <LiquidGlassCard
                  padding="lg"
                  className="w-full h-full flex flex-col items-center justify-center text-center border-dashed border-white/10"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/40">
                    <Music className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-white/80 font-sf">
                    No Media Playing
                  </span>
                  <span className="text-xs text-white/40 mt-1">
                    Connect Bluetooth to stream audio
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasActiveMedia(true)}
                    className="mt-4 inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Connect Audio</span>
                  </button>
                </LiquidGlassCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
