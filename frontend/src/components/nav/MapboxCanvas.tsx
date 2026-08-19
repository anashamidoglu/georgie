import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNav } from '../../context/NavContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE_URL ||
  'mapbox://styles/anashamidoglu/cmsyvjr3u008r01qy85q81iyr';

function getComputedLightPreset(): 'day' | 'dusk' | 'night' | 'dawn' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

export const MapboxCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    isNavExpanded,
    coords,
    vehicleCoords,
    vehicleHeading,
    setMapInstance,
    activeRoute,
    availableRoutes,
    selectedRouteIndex,
    selectRoute,
    destination,
    previewRouteTo,
    navStatus,
  } = useNav();

  // Keep refs up to date
  const previewRouteToRef = useRef(previewRouteTo);
  previewRouteToRef.current = previewRouteTo;

  const selectRouteRef = useRef(selectRoute);
  selectRouteRef.current = selectRoute;

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
        center: vehicleCoords || coords,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        attributionControl: false,
        preserveDrawingBuffer: false,
      });

      mapRef.current = map;

      // Clean, non-pulsing Apple Maps style vehicle position puck
      const puckEl = document.createElement('div');
      puckEl.className = 'relative flex items-center justify-center';
      puckEl.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-[#0ea5e9] border-[2.5px] border-white shadow-[0_2px_10px_rgba(14,165,233,0.9)] flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-white"></div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: puckEl,
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat(vehicleCoords || coords)
        .addTo(map);

      markerRef.current = marker;

      // Map click handler (guarded against clicks on UI overlay buttons)
      map.on('click', (e) => {
        const originalTarget = e.originalEvent?.target as HTMLElement | null;
        if (originalTarget && originalTarget.closest('.pointer-events-auto')) {
          return;
        }

        // Check if an alternative route line was clicked
        if (map.getLayer('alt-routes-layer')) {
          const features = map.queryRenderedFeatures(e.point, { layers: ['alt-routes-layer'] });
          if (features && features.length > 0) {
            const targetRouteId = (features[0] as any).properties?.routeId;
            if (typeof targetRouteId === 'number') {
              selectRouteRef.current(targetRouteId);
              return;
            }
          }
        }

        const clickedLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        previewRouteToRef.current(clickedLngLat, 'Pinned Location');
      });

      map.on('mouseenter', 'alt-routes-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'alt-routes-layer', () => {
        map.getCanvas().style.cursor = '';
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
    if (markerRef.current && (vehicleCoords || coords)) {
      markerRef.current.setLngLat(vehicleCoords || coords);
      markerRef.current.setRotation(vehicleHeading || 0);
    }
  }, [vehicleCoords, coords, vehicleHeading]);

  // Update destination pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && navStatus !== 'idle') {
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
  }, [destination, navStatus]);

  // Render & update live Route GeoJSON lines (Active Traffic Ribbon + Alternative Routes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const altSourceId = 'alt-routes-source';
    const altLayerId = 'alt-routes-layer';
    const activeSourceId = 'active-route-source';
    const casingLayerId = 'active-route-casing';
    const coreLayerId = 'active-route-core';

    if (navStatus !== 'idle' && activeRoute) {
      // 1. Render Alternative Routes (Unselected candidate paths)
      const altFeatures: any[] = [];
      availableRoutes.forEach((route, idx) => {
        if (idx !== selectedRouteIndex && route.rawGeometry) {
          altFeatures.push({
            type: 'Feature',
            properties: { routeId: idx },
            geometry: route.rawGeometry,
          });
        }
      });

      const altGeoJson = {
        type: 'FeatureCollection',
        features: altFeatures,
      };

      const existingAltSource = map.getSource(altSourceId) as mapboxgl.GeoJSONSource;
      if (existingAltSource) {
        existingAltSource.setData(altGeoJson as any);
      } else {
        map.addSource(altSourceId, {
          type: 'geojson',
          data: altGeoJson as any,
        });

        map.addLayer({
          id: altLayerId,
          type: 'line',
          source: altSourceId,
          slot: 'middle',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#64748b',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 3.5,
              14, 5.0,
              17, 7.0,
            ],
            'line-opacity': 0.65,
            'line-emissive-strength': 0.5,
          },
        });
      }

      // 2. Render Active Traffic-Colored Route Line
      const activeGeoJson = activeRoute.geoJson;
      const existingActiveSource = map.getSource(activeSourceId) as mapboxgl.GeoJSONSource;
      if (existingActiveSource) {
        existingActiveSource.setData(activeGeoJson as any);
      } else {
        map.addSource(activeSourceId, {
          type: 'geojson',
          data: activeGeoJson as any,
        });

        // Crisp outline casing with traffic matching
        map.addLayer({
          id: casingLayerId,
          type: 'line',
          source: activeSourceId,
          slot: 'middle',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'congestion'],
              'moderate', '#b45309',
              'heavy', '#b91c1c',
              'severe', '#7f1d1d',
              '#0284c7',
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 5.0,
              14, 7.0,
              17, 9.5,
            ],
            'line-opacity': 0.9,
            'line-blur': 0,
            'line-emissive-strength': 0.8,
          },
        });

        // Solid self-luminous core with live traffic colors
        map.addLayer({
          id: coreLayerId,
          type: 'line',
          source: activeSourceId,
          slot: 'middle',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'congestion'],
              'moderate', '#f59e0b',
              'heavy', '#ef4444',
              'severe', '#dc2626',
              '#0ea5e9',
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 3.2,
              14, 4.8,
              17, 6.8,
            ],
            'line-opacity': 1.0,
            'line-emissive-strength': 1.0,
          },
        });
      }

      // If in preview mode, smoothly fit the whole route overview
      if (navStatus === 'preview') {
        const coordinates = activeRoute.rawGeometry?.coordinates || [];
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0] as [number, number];
          const bounds = new mapboxgl.LngLatBounds(firstCoord, firstCoord);
          availableRoutes.forEach((r) => {
            r.rawGeometry?.coordinates.forEach((coord) => {
              bounds.extend(coord as [number, number]);
            });
          });

          map.fitBounds(bounds, {
            padding: { top: 60, bottom: 90, left: 50, right: 50 },
            maxZoom: 15,
            pitch: 15,
            duration: 800,
          });
        }
      }
    } else {
      // Remove route layers if route is cleared/idle
      if (map.getLayer(coreLayerId)) map.removeLayer(coreLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(activeSourceId)) map.removeSource(activeSourceId);
      if (map.getLayer(altLayerId)) map.removeLayer(altLayerId);
      if (map.getSource(altSourceId)) map.removeSource(altSourceId);
    }
  }, [activeRoute, availableRoutes, selectedRouteIndex, navStatus]);

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
