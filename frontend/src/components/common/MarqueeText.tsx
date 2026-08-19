import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // duration in seconds
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  speed = 10,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={`w-full overflow-hidden truncate ${className}`}>
        <span ref={textRef}>{text}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden whitespace-nowrap relative mask-marquee ${className}`}
    >
      <div
        className="inline-flex animate-marquee space-x-8"
        style={{ animationDuration: `${speed}s` }}
      >
        <span ref={textRef} className="flex-shrink-0">
          {text}
        </span>
        <span className="flex-shrink-0" aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
};
