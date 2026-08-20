import React, { useEffect } from 'react';
import { NavDockedViewport } from '../components/nav/NavDockedViewport';
import { NavPreviewCard } from '../components/nav/NavPreviewCard';
import { RouteSelectionCard } from '../components/nav/RouteSelectionCard';
import { DateTimeCard } from '../components/common/DateTimeCard';
import { MediaDockedCard } from '../components/media/MediaDockedCard';
import { CallDockedCard } from '../components/calls/CallDockedCard';
import { UpcomingManeuversCard } from '../components/nav/UpcomingManeuversCard';
import { WidgetStackCard, type WidgetItem } from '../components/common/WidgetStackCard';
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

  // Bluetooth Media Widget
  const bluetoothMediaWidget: WidgetItem = {
    id: 'media_player',
    label: 'Media Player',
    content: (
      <MediaDockedCard
        track={currentTrack}
        onPlayPause={togglePlayPause}
        onNext={nextTrack}
        onPrev={prevTrack}
      />
    ),
  };

  // Stackable Widgets for Navigation / Route Preview Mode (Call -> Upcoming Steps -> Media (if active))
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
    ...(hasActiveMedia ? [bluetoothMediaWidget] : []),
  ];

  // Stackable Widgets for Idle Mode (Call -> Media (if active))
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
    ...(hasActiveMedia ? [bluetoothMediaWidget] : []),
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
            ) : idleWidgets.length > 0 ? (
              <WidgetStackCard
                widgets={idleWidgets}
                defaultIndex={0}
                className="w-full h-full"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
