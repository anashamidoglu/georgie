import React, { useEffect, useRef, useState } from 'react';
import { Loader2, EyeOff, Navigation } from 'lucide-react';
import { loadGoogleMapsScript } from '../../services/streetViewService';

interface StreetViewPanoramaViewProps {
  coordinates: [number, number]; // [lng, lat]
  heading?: number; // Forward azimuth heading in degrees (0-360)
  stepName?: string;
}

export const StreetViewPanoramaView: React.FC<StreetViewPanoramaViewProps> = ({
  coordinates,
  heading = 0,
  stepName = 'Step Preview',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const svServiceRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasCoverage, setHasCoverage] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [lng, lat] = coordinates || [55.419909, 25.362693];

  useEffect(() => {
    let isMounted = true;

    async function initStreetView() {
      if (!containerRef.current) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const googleMaps = await loadGoogleMapsScript();
        if (!isMounted || !containerRef.current) return;

        if (!svServiceRef.current) {
          svServiceRef.current = new googleMaps.StreetViewService();
        }

        const targetLatLng = new googleMaps.LatLng(lat, lng);

        // 1. First check metadata / panorama within 80 meters radius
        svServiceRef.current.getPanorama(
          { location: targetLatLng, radius: 80, source: googleMaps.StreetViewSource.DEFAULT },
          (data: any, status: string) => {
            if (!isMounted) return;

            if (status === googleMaps.StreetViewStatus.OK && data?.location?.latLng) {
              setHasCoverage(true);

              if (!panoramaRef.current && containerRef.current) {
                panoramaRef.current = new googleMaps.StreetViewPanorama(containerRef.current, {
                  position: data.location.latLng,
                  pov: { heading, pitch: 0 },
                  zoom: 1,
                  addressControl: false,
                  showRoadLabels: true,
                  linksControl: true,
                  clickToGo: true,
                  panControl: false,
                  zoomControl: false,
                  fullscreenControl: false,
                  motionTracking: false,
                  motionTrackingControl: false,
                });
              } else if (panoramaRef.current) {
                panoramaRef.current.setPosition(data.location.latLng);
                panoramaRef.current.setPov({ heading, pitch: 0 });
              }

              setIsLoading(false);
            } else {
              setHasCoverage(false);
              setIsLoading(false);
            }
          }
        );
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Street View initialization failed:', err);
        setErrorMsg(err.message || 'Unable to load Street View');
        setHasCoverage(false);
        setIsLoading(false);
      }
    }

    initStreetView();

    return () => {
      isMounted = false;
    };
  }, [lat, lng, heading]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0c10] select-none">
      {/* 1. Google Maps Street View 360 Panorama Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ filter: 'brightness(0.95) contrast(1.05)' }}
      />

      {/* 2. Top Heading & Road Badge Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center space-x-2.5">
        <div className="px-3.5 py-1.5 rounded-full bg-black/85 border border-white/20 shadow-2xl backdrop-blur-md flex items-center space-x-2 text-white">
          <Navigation className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
          <span className="text-xs font-bold font-sf truncate max-w-[280px]">
            {stepName}
          </span>
          <span className="text-[10px] text-white/50 font-bold tabular-nums">
            {Math.round(heading)}°
          </span>
        </div>
      </div>

      {/* 3. Loading Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 font-sf">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-sm font-semibold text-white/80">
            Loading Street View...
          </span>
        </div>
      )}

      {/* 4. No Coverage / Fallback Placeholder */}
      {!isLoading && (!hasCoverage || errorMsg) && (
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#11131a] to-[#08090c] flex flex-col items-center justify-center p-6 text-center font-sf">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
            <EyeOff className="w-7 h-7" />
          </div>
          <span className="text-base font-bold text-white mb-1">
            Street View Unavailable
          </span>
          <span className="text-xs text-white/50 max-w-[280px] leading-relaxed">
            {errorMsg
              ? 'Please ensure Street View Static API is enabled in your Google Cloud Console.'
              : 'No 360° street imagery is recorded for this specific road segment yet.'}
          </span>
          <span className="text-[11px] text-sky-400 font-semibold mt-3">
            Use the step controls below to view next maneuver
          </span>
        </div>
      )}
    </div>
  );
};
