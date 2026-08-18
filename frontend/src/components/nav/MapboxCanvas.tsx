import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNav } from '../../context/NavContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/dark-v11';

// Calculate lighting preset dynamically from current local time
function getComputedLightPreset(): 'day' | 'dusk' | 'night' | 'dawn' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night'; // 8:00 PM to 6:00 AM
}

export const MapboxCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { isNavExpanded, coords, setMapInstance } = useNav();

  const applyLighting = (map: mapboxgl.Map) => {
    const preset = getComputedLightPreset();
    try {
      map.setConfigProperty('basemap', 'lightPreset', preset);
    } catch {
      // In case style is not using the Mapbox Standard schema
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
      setErrorMsg('Mapbox requires a Public Access Token starting with "pk." (e.g. pk.eyJ1...). Please copy your default public token from account.mapbox.com into frontend/.env.local');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: coords,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        attributionControl: false,
        preserveDrawingBuffer: false,
      });

      mapRef.current = map;

      // High-precision pulsing Apple-style vehicle position puck
      const puckEl = document.createElement('div');
      puckEl.className = 'relative flex items-center justify-center';
      puckEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-sky-400/25 animate-ping absolute"></div>
        <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.9)] flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: puckEl,
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat(coords)
        .addTo(map);

      markerRef.current = marker;

      map.on('style.load', () => {
        applyLighting(map);
      });

      map.on('load', () => {
        applyLighting(map);
        setMapInstance(map);
        map.resize();
      });

      map.on('error', (e) => {
        console.error('Mapbox runtime error:', e);
      });

      const handleResize = () => {
        map.resize();
      };
      window.addEventListener('resize', handleResize);

      // Periodically sync lighting preset every 60 seconds
      const lightInterval = setInterval(() => {
        if (mapRef.current) {
          applyLighting(mapRef.current);
        }
      }, 60000);

      return () => {
        clearInterval(lightInterval);
        window.removeEventListener('resize', handleResize);
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        map.remove();
        mapRef.current = null;
        setMapInstance(null);
      };
    } catch (err: any) {
      console.error('Mapbox initialization failed:', err);
      setErrorMsg(err.message || 'Mapbox initialization failed');
    }
  }, []);

  // Update vehicle puck position on coordinates change
  useEffect(() => {
    if (markerRef.current && coords) {
      markerRef.current.setLngLat(coords);
    }
  }, [coords]);

  // Trigger smooth resize on view-state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
    return () => clearTimeout(timer);
  }, [isNavExpanded]);

  if (errorMsg) {
    return (
      <div className="absolute inset-0 w-full h-full bg-[#0c0d11] flex flex-col items-center justify-center text-center p-6 select-none font-sf">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 font-bold text-lg">
          !
        </div>
        <span className="text-sm font-semibold text-white/90 max-w-sm leading-snug">
          Mapbox Public Token Required
        </span>
        <span className="text-xs text-white/50 max-w-xs mt-1.5 leading-normal">
          {errorMsg}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-[#08080a]"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
