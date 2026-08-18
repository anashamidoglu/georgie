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
  return 'night';
}

export const MapboxCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    isNavExpanded,
    coords,
    setMapInstance,
    activeRoute,
    destination,
    calculateRouteTo,
    hasActiveRoute,
  } = useNav();

  const applyLighting = (map: mapboxgl.Map) => {
    const preset = getComputedLightPreset();
    try {
      map.setConfigProperty('basemap', 'lightPreset', preset);
    } catch {
      // Custom style might not use Standard lighting schema
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
      setErrorMsg('Mapbox requires a Public Access Token starting with "pk." (e.g. pk.eyJ1...). Please copy your default public token into frontend/.env.local');
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

      // Tap on map to set destination and route
      map.on('click', (e) => {
        const clickedLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        calculateRouteTo(clickedLngLat);
      });

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
        if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
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

  // Update destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && hasActiveRoute) {
      if (!destMarkerRef.current) {
        const destEl = document.createElement('div');
        destEl.className = 'w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_rgba(16,185,129,0.8)] flex items-center justify-center';
        destEl.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';

        destMarkerRef.current = new mapboxgl.Marker({ element: destEl })
          .setLngLat(destination)
          .addTo(map);
      } else {
        destMarkerRef.current.setLngLat(destination);
      }
    } else {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }
  }, [destination, hasActiveRoute]);

  // Render & update live Route GeoJSON line on Mapbox
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'active-route-source';
    const casingLayerId = 'active-route-casing';
    const coreLayerId = 'active-route-core';

    if (hasActiveRoute && activeRoute?.geoJson) {
      const geoJsonData = activeRoute.geoJson;

      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geoJsonData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData,
        });

        // Outer translucent glowing blue casing
        map.addLayer({
          id: casingLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0284c7',
            'line-width': 10,
            'line-opacity': 0.4,
            'line-blur': 2,
          },
        });

        // Inner solid electric blue core line
        map.addLayer({
          id: coreLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 5.5,
            'line-opacity': 0.95,
          },
        });
      }

      // Smoothly frame bounds around the new route
      const coordinates = geoJsonData.geometry.coordinates;
      if (coordinates.length > 0) {
        const firstCoord = coordinates[0] as [number, number];
        const bounds = new mapboxgl.LngLatBounds(firstCoord, firstCoord);
        coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
        });

        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 90, left: 60, right: 60 },
          maxZoom: 16,
          duration: 1200,
        });
      }
    } else {
      // Remove route layers if route is cleared/idle
      if (map.getLayer(coreLayerId)) map.removeLayer(coreLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [activeRoute, hasActiveRoute]);

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
