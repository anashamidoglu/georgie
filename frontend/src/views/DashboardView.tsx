import React from 'react';
import { NavDockedViewport } from '../components/nav/NavDockedViewport';
import { NavPreviewCard } from '../components/nav/NavPreviewCard';
import { RouteSelectionCard } from '../components/nav/RouteSelectionCard';
import { DateTimeCard } from '../components/common/DateTimeCard';
import { MediaDockedCard } from '../components/media/MediaDockedCard';
import { UpcomingManeuversCard } from '../components/nav/UpcomingManeuversCard';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Music, PlusCircle } from 'lucide-react';
import { useNav } from '../context/NavContext';
import { useMedia } from '../context/MediaContext';

export const DashboardView: React.FC = () => {
  const {
    isNavExpanded,
    navStatus,
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

        {/* Right Column: Stacked Turn/Route/Date Card & Media/Turns/Placeholder */}
        {!isNavExpanded && (
          <div className="col-span-5 h-full min-h-0 max-h-full flex flex-col space-y-3.5 overflow-hidden transition-all duration-300">
            {/* Top Right: Active Turn (Navigating OR Step Preview) OR Route Selection Dropdown OR Free-sitting Date/Time */}
            <div className="flex-shrink-0">
              {navStatus === 'navigating' || inspectedStep !== null ? (
                <NavPreviewCard />
              ) : navStatus === 'preview' ? (
                <RouteSelectionCard />
              ) : (
                <DateTimeCard />
              )}
            </div>

            {/* Bottom Right: Upcoming Steps (if Nav active/preview) OR Full Media Card (if Nav idle & media playing) OR Audio Placeholder */}
            <div className="flex-1 min-h-0 max-h-full flex flex-col overflow-hidden">
              {navStatus !== 'idle' ? (
                /* When Nav is preview/active -> Upcoming Steps takes 100% priority */
                <UpcomingManeuversCard />
              ) : hasActiveMedia ? (
                /* When Nav is idle & media is playing -> Full Media Card */
                <MediaDockedCard
                  track={currentTrack}
                  onPlayPause={togglePlayPause}
                  onNext={nextTrack}
                  onPrev={prevTrack}
                />
              ) : (
                /* When Nav is idle & no media -> Clean audio placeholder */
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
