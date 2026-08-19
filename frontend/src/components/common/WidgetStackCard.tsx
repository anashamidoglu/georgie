import React, { useState, useRef, useEffect } from 'react';

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
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const mouseStartX = useRef<number | null>(null);

  // Sync index if defaultIndex changes (e.g. when navigating begins)
  useEffect(() => {
    if (defaultIndex >= 0 && defaultIndex < widgets.length) {
      setActiveIndex(defaultIndex);
    }
  }, [defaultIndex, widgets.length]);

  if (widgets.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe threshold (> 40px and more horizontal than vertical)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && activeIndex < widgets.length - 1) {
        // Swipe Left -> Next Widget
        setActiveIndex((prev) => prev + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        // Swipe Right -> Prev Widget
        setActiveIndex((prev) => prev - 1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on primary mouse button
    if (e.button !== 0) return;
    mouseStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;

    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0 && activeIndex < widgets.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }

    mouseStartX.current = null;
    isDragging.current = false;
  };

  return (
    <div
      className={`relative w-full h-full min-h-0 max-h-full overflow-hidden select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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

      {/* iOS-Style Floating Stack Pagination Dots (Shown only if more than 1 widget) */}
      {widgets.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-20 pointer-events-auto bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
          {widgets.map((widget, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={widget.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
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
