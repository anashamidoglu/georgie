import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface StreetViewPanoramaViewProps {
  coordinates: [number, number]; // [lng, lat]
  heading?: number; // Forward azimuth heading in degrees (0-360)
  stepName?: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

export const StreetViewPanoramaView: React.FC<StreetViewPanoramaViewProps> = ({
  coordinates,
  heading = 0,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [lng, lat] = coordinates || [55.419909, 25.362693];
  const roundedHeading = Math.round(heading || 0);

  // Google Maps Embed API Street View URL (Supports full 360 pan, tilt, zoom, and navigation)
  const embedUrl = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_API_KEY}&location=${lat},${lng}&heading=${roundedHeading}&pitch=0&fov=90`;

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [lat, lng, roundedHeading]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090a0f] select-none flex flex-col">
      {/* 1. Interactive 360° Google Street View Embed Iframe (Cropped at top to remove Google info bar) */}
      {GOOGLE_API_KEY ? (
        <div className="w-full h-full overflow-hidden relative">
          <iframe
            ref={iframeRef}
            key={`${lat.toFixed(5)}_${lng.toFixed(5)}_${roundedHeading}`}
            title="Google Street View"
            src={embedUrl}
            className="w-full h-[calc(100%+80px)] -mt-[80px] border-0"
            style={{ filter: 'brightness(0.95) contrast(1.05)' }}
            loading="eager"
            allow="accelerometer; gyroscope; magnetometer"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-sf bg-[#0c0e14]">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
          <span className="text-sm font-bold text-white mb-1">
            Google API Key Missing
          </span>
          <span className="text-xs text-white/50 max-w-[280px]">
            Please ensure VITE_GOOGLE_PLACES_API_KEY is configured in your .env file.
          </span>
        </div>
      )}

      {/* 2. Sleek Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 font-sf transition-opacity duration-200 pointer-events-none">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-xs font-bold text-white/80">
            Loading 360° Street View...
          </span>
        </div>
      )}

      {/* 4. API Key Restriction Notice if error encountered */}
      {hasError && (
        <div className="absolute inset-0 z-20 bg-[#0c0e14] flex flex-col items-center justify-center p-6 text-center font-sf">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-white mb-1">
            Street View Access Restricted
          </span>
          <span className="text-xs text-white/50 max-w-[280px] leading-relaxed">
            In Google Cloud Console &gt; Credentials &gt; API Key, ensure "Maps Embed API" and "Maps JavaScript API" are enabled under API restrictions.
          </span>
        </div>
      )}
    </div>
  );
};
