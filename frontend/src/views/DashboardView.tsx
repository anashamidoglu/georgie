import React, { useEffect } from 'react';
import { NavDockedViewport } from '../components/nav/NavDockedViewport';
import { NavPreviewCard } from '../components/nav/NavPreviewCard';
import { RouteSelectionCard } from '../components/nav/RouteSelectionCard';
import { DateTimeCard } from '../components/common/DateTimeCard';
import { MediaDockedCard } from '../components/media/MediaDockedCard';
import { CallDockedCard } from '../components/calls/CallDockedCard';
import { UpcomingManeuversCard } from '../components/nav/UpcomingManeuversCard';
import { WidgetStackCard, type WidgetItem } from '../components/common/WidgetStackCard';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Music, PlusCircle } from 'lucide-react';
import { useNav } from '../context/NavContext';
import { useMedia } from '../context/MediaContext';
import { useCall } from '../context/CallContext';

export const DashboardView: React.FC = () => {
  const {
    isNavExpanded,
    setIsNavExpanded,
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

  const { callStatus } = useCall();

  // Dynamic Layout Rule:
  // - When a call is incoming/active and Nav is idle -> Expand to split view so Call card is prominent.
  // - When Nav is idle, no call, and media is OFF -> Expanded full-bleed navigation map is default.
  // - When Nav is idle and media is ON -> Resizes to split view (Date + Media).
  useEffect(() => {
    if (navStatus === 'idle') {
      if (callStatus !== 'idle') {
        setIsNavExpanded(false);
      } else if (!hasActiveMedia) {
        setIsNavExpanded(true);
      } else {
        setIsNavExpanded(false);
      }
    }
  }, [hasActiveMedia, navStatus, callStatus, setIsNavExpanded]);

  // Media Player Card Element (shared across widget stack & idle views)
  const mediaCardContent = hasActiveMedia ? (
    <MediaDockedCard
      track={currentTrack}
      onPlayPause={togglePlayPause}
      onNext={nextTrack}
      onPrev={prevTrack}
    />
  ) : (
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
  );

  // Stackable Widgets for Navigation / Route Preview Mode (Call -> Upcoming Steps -> Media)
  const navWidgets: WidgetItem[] = [
    ...(callStatus !== 'idle'
      ? [
          {
            id: 'active_call',
            label: 'Call',
            content: <CallDockedCard />,
          },
        ]
      : []),
    {
      id: 'upcoming_steps',
      label: 'Upcoming Steps',
      content: <UpcomingManeuversCard />,
    },
    ...(hasActiveMedia
      ? [
          {
            id: 'media_player',
            label: 'Media Player',
            content: mediaCardContent,
          },
        ]
      : []),
  ];

  // Stackable Widgets for Idle Mode (Call -> Media)
  const idleWidgets: WidgetItem[] = [
    ...(callStatus !== 'idle'
      ? [
          {
            id: 'active_call',
            label: 'Call',
            content: <CallDockedCard />,
          },
        ]
      : []),
    ...(hasActiveMedia
      ? [
          {
            id: 'media_player',
            label: 'Media Player',
            content: mediaCardContent,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full h-full p-3.5 relative overflow-hidden flex flex-col justify-between max-h-full">
      {/* Main Container: Left Primary Map vs Right Stacked Cards with smooth CSS width & fade transition */}
      <div className="w-full h-full min-h-0 max-h-full flex items-stretch overflow-hidden">
        {/* Left Column: Navigation Docked / Expanded Viewport */}
        <div
          className={`h-full min-h-0 max-h-full overflow-hidden transition-[width,flex-basis] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isNavExpanded ? 'w-full flex-1' : 'w-[58.333%] flex-shrink-0'
          }`}
        >
          <NavDockedViewport />
        </div>

        {/* Right Column: Top Card (Turn/Route/Date) & Bottom Stackable Widget (Call <-> Steps <-> Media) */}
        <div
          className={`h-full min-h-0 max-h-full flex flex-col space-y-3.5 overflow-hidden transition-[width,opacity,transform,padding,margin] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isNavExpanded
              ? 'w-0 opacity-0 pointer-events-none ml-0 pl-0 scale-95'
              : 'w-[41.667%] opacity-100 flex-1 ml-3.5 scale-100'
          }`}
        >
          {/* Top Right: Active Turn (Navigating OR Step Preview) OR Route Selection Dropdown OR Formatted Date/Time */}
          <div className="flex-shrink-0">
            {navStatus === 'navigating' || inspectedStep !== null ? (
              <NavPreviewCard />
            ) : navStatus === 'preview' ? (
              <RouteSelectionCard />
            ) : (
              <DateTimeCard />
            )}
          </div>

          {/* Bottom Right: iOS-Style Swipeable Widget Stack (Call <-> Upcoming Steps <-> Media) */}
          <div className="flex-1 min-h-0 max-h-full flex flex-col overflow-hidden relative">
            {navStatus !== 'idle' ? (
              <WidgetStackCard
                widgets={navWidgets}
                defaultIndex={0}
                className="w-full h-full"
              />
            ) : idleWidgets.length > 1 ? (
              <WidgetStackCard
                widgets={idleWidgets}
                defaultIndex={0}
                className="w-full h-full"
              />
            ) : callStatus !== 'idle' ? (
              <CallDockedCard />
            ) : (
              mediaCardContent
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
