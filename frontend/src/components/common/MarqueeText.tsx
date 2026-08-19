import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // duration in seconds
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  speed = 12,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && measureRef.current) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const textWidth = measureRef.current.getBoundingClientRect().width;
        setIsOverflowing(textWidth > containerWidth - 2);
      }
    };

    checkOverflow();
    const rafId = requestAnimationFrame(checkOverflow);
    const timer = setTimeout(checkOverflow, 200);
    window.addEventListener('resize', checkOverflow);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div ref={containerRef} className={`w-full overflow-hidden relative ${className}`}>
      {/* Hidden unconstrained span for precise pixel measurement */}
      <span
        ref={measureRef}
        className="absolute top-0 left-0 opacity-0 pointer-events-none whitespace-nowrap invisible inline-block"
        aria-hidden="true"
      >
        {text}
      </span>

      {isOverflowing ? (
        <div className="w-full overflow-hidden whitespace-nowrap mask-marquee">
          <div
            className="inline-flex animate-marquee space-x-8"
            style={{ animationDuration: `${speed}s` }}
          >
            <span className="flex-shrink-0">{text}</span>
            <span className="flex-shrink-0" aria-hidden="true">
              {text}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full truncate">
          <span>{text}</span>
        </div>
      )}
    </div>
  );
};
