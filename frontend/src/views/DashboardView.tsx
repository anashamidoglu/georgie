import React, { useState } from 'react';
import { NavDockedViewport } from '../components/nav/NavDockedViewport';
import { NavPreviewCard } from '../components/nav/NavPreviewCard';
import { DateTimeCard } from '../components/common/DateTimeCard';
import { MediaDockedCard } from '../components/media/MediaDockedCard';
import { UpcomingManeuversCard } from '../components/nav/UpcomingManeuversCard';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Music, PlusCircle, MapPin } from 'lucide-react';
import { useNav } from '../context/NavContext';
import type { MediaTrack } from '../types';

export const DashboardView: React.FC = () => {
  const { isNavExpanded, navStatus, previewRouteTo, endNavigation, destinationName } = useNav();

  // Mock states for interactive dev testing
  const [hasActiveMedia, setHasActiveMedia] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<MediaTrack>({
    title: 'Beneath the Mask',
    artist: 'Lyn',
    duration: 278,
    currentTime: 45,
    isPlaying: true,
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/10/fe/ad10fee6-76eb-7eaa-a632-c2afece21b53/LNCM-1175_PERSONA5-OST_h1_new.jpg/600x600bb.jpg',
  });

  // Key local landmark presets
  const PRESETS: { label: string; coords: [number, number] }[] = [
    { label: 'UOS Medical', coords: [55.4855, 25.2917] },
    { label: 'MCC', coords: [55.4077, 25.2155] },
    { label: 'Dubai Mall', coords: [55.2785, 25.1972] },
  ];

  return (
    <div className="w-full h-full p-3.5 relative overflow-hidden flex flex-col justify-between max-h-full">
      {/* Dev Control Bar */}
      <div className="absolute top-1.5 right-4 z-40 flex items-center space-x-2">
        {/* Quick Destination Presets */}
        <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
          <span className="text-[9px] font-sf font-semibold text-white/40 uppercase tracking-wider mr-1">
            Route To:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => previewRouteTo(p.coords, p.label)}
              className="text-[9px] font-sf font-medium px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/20 text-white/80 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Toggle Nav State */}
        <button
          type="button"
          onClick={() => {
            if (navStatus === 'idle') {
              previewRouteTo([55.4855, 25.2917], 'UOS Medical');
            } else {
              endNavigation();
            }
          }}
          className={`text-[10px] font-sf font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
            navStatus !== 'idle'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-white/10 text-white/70 border-white/10'
          }`}
        >
          [DEV] Nav ({navStatus === 'idle' ? 'Idle' : 'Active'})
        </button>

        {/* Toggle Media State */}
        <button
          type="button"
          onClick={() => setHasActiveMedia(!hasActiveMedia)}
          className={`text-[10px] font-sf font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
            hasActiveMedia
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-white/10 text-white/70 border-white/10'
          }`}
        >
          [DEV] Media ({hasActiveMedia ? 'Playing' : 'No Media'})
        </button>
      </div>

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
            {/* Top Right: Active Turn (Navigating) OR Destination Preview Card OR Free-sitting Date/Time (Idle) */}
            <div className="flex-shrink-0">
              {navStatus === 'navigating' ? (
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

            {/* Bottom Right: Media Card OR Upcoming Maneuvers (if Nav active) OR Clean Placeholder (if Nav idle) */}
            <div className="flex-1 min-h-0 max-h-full flex flex-col overflow-hidden">
              {hasActiveMedia ? (
                <MediaDockedCard
                  track={currentTrack}
                  onPlayPause={() =>
                    setCurrentTrack((prev) => ({
                      ...prev,
                      isPlaying: !prev.isPlaying,
                    }))
                  }
                  onNext={() =>
                    setCurrentTrack({
                      title: 'Last Surprise',
                      artist: 'Lyn',
                      album: 'Persona 5 (Original Soundtrack)',
                      duration: 235,
                      currentTime: 14,
                      isPlaying: true,
                      artworkUrl:
                        'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/10/fe/ad10fee6-76eb-7eaa-a632-c2afece21b53/LNCM-1175_PERSONA5-OST_h1_new.jpg/600x600bb.jpg',
                    })
                  }
                  onPrev={() =>
                    setCurrentTrack({
                      title: 'Beneath the Mask',
                      artist: 'Lyn',
                      album: 'Persona 5 (Original Soundtrack)',
                      duration: 278,
                      currentTime: 45,
                      isPlaying: true,
                      artworkUrl:
                        'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/10/fe/ad10fee6-76eb-7eaa-a632-c2afece21b53/LNCM-1175_PERSONA5-OST_h1_new.jpg/600x600bb.jpg',
                    })
                  }
                />
              ) : navStatus !== 'idle' ? (
                /* When Nav is preview/active and no media is playing -> Full Upcoming Maneuvers list */
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
