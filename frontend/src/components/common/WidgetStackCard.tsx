import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface WidgetItem {
  id: string;
  label?: string;
  content: React.ReactNode;
}

interface WidgetStackCardProps {
  widgets: WidgetItem[];
  defaultIndex?: number;
  className?: string;
}

export const WidgetStackCard: React.FC<WidgetStackCardProps> = ({
  widgets,
  defaultIndex = 0,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(defaultIndex);
  const [showIndicator, setShowIndicator] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  
  // Gesture references
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const isPointerDown = useRef<boolean>(false);
  
  // Trackpad 2-finger wheel swipe references
  const wheelAccumulator = useRef<number>(0);
  const wheelCooldown = useRef<boolean>(false);

  // Auto-hide indicator dots after 2.2 seconds of inactivity
  const triggerActivity = useCallback(() => {
    setShowIndicator(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setShowIndicator(false);
    }, 2200);
  }, []);

  useEffect(() => {
    triggerActivity();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [triggerActivity, activeIndex]);

  // Sync index if defaultIndex changes (e.g. when navigating starts)
  useEffect(() => {
    if (defaultIndex >= 0 && defaultIndex < widgets.length) {
      setActiveIndex(defaultIndex);
      triggerActivity();
    }
  }, [defaultIndex, widgets.length, triggerActivity]);

  // Clamp index if widgets array shrinks (e.g. media stopped)
  useEffect(() => {
    if (activeIndex >= widgets.length) {
      setActiveIndex(Math.max(0, widgets.length - 1));
    }
  }, [widgets.length, activeIndex]);

  if (widgets.length === 0) return null;

  // 1. Laptop Trackpad 2-Finger Horizontal Swipe
  const handleWheel = (e: React.WheelEvent) => {
    triggerActivity();
    if (wheelCooldown.current) return;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
      wheelAccumulator.current += e.deltaX;

      if (wheelAccumulator.current > 25 && activeIndex < widgets.length - 1) {
        // Trackpad swipe right-to-left -> Next Page
        setActiveIndex((prev) => prev + 1);
        wheelCooldown.current = true;
        wheelAccumulator.current = 0;
        setTimeout(() => {
          wheelCooldown.current = false;
        }, 350);
      } else if (wheelAccumulator.current < -25 && activeIndex > 0) {
        // Trackpad swipe left-to-right -> Prev Page
        setActiveIndex((prev) => prev - 1);
        wheelCooldown.current = true;
        wheelAccumulator.current = 0;
        setTimeout(() => {
          wheelCooldown.current = false;
        }, 350);
      }
    }
  };

  // 2. Direct Pointer / Mouse / Touch Drag Swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    // Avoid hijacking interactive buttons/controls (play/skip/inspect)
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    isPointerDown.current = true;
    triggerActivity();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current || pointerStartX.current === null) return;
    const deltaX = e.clientX - pointerStartX.current;
    const deltaY = pointerStartY.current !== null ? Math.abs(e.clientY - pointerStartY.current) : 0;

    // Trigger swipe if horizontal displacement is significant
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > deltaY) {
      if (deltaX < 0 && activeIndex < widgets.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    pointerStartX.current = null;
    pointerStartY.current = null;
    isPointerDown.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    triggerActivity();
    pointerStartX.current = e.touches[0].clientX;
    pointerStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pointerStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - pointerStartX.current;
    const deltaY = pointerStartY.current !== null ? Math.abs(e.changedTouches[0].clientY - pointerStartY.current) : 0;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > deltaY) {
      if (deltaX < 0 && activeIndex < widgets.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    pointerStartX.current = null;
    pointerStartY.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-0 max-h-full overflow-hidden select-none touch-pan-y ${className}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseMove={triggerActivity}
    >
      {/* Sliding Widget Stack Carousel */}
      <div
        className="w-full h-full flex transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="w-full h-full min-w-full flex-shrink-0 overflow-hidden"
          >
            {widget.content}
          </div>
        ))}
      </div>

      {/* iOS-Style Auto-Fading Stack Pagination Dots */}
      {widgets.length > 1 && (
        <div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-xl transition-opacity duration-500 ${
            showIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {widgets.map((widget, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={widget.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                  triggerActivity();
                }}
                aria-label={`Switch to ${widget.label || `Widget ${idx + 1}`}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'w-4 bg-white shadow-sm'
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
