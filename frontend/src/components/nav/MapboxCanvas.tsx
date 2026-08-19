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

function getHaversineDistance(c1: [number, number], c2: [number, number]): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (c2[1] - c1[1]) * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1[1] * rad) * Math.cos(c2[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function processActiveRouteGeoJson(
  features: any[],
  currentLegIndex: number,
  vehicleCoords: [number, number],
  isNavigating: boolean
): any[] {
  if (!features || features.length === 0) return [];

  const result: any[] = [];
  let foundActiveSegment = false;

  for (const feat of features) {
    const legIdx = feat.properties?.legIndex ?? 0;

    // 1. In navigation mode: Completely remove past completed legs
    if (isNavigating && legIdx < currentLegIndex) {
      continue;
    }

    // 2. Future subsequent legs: Heavily dim
    if (legIdx > currentLegIndex) {
      result.push({
        ...feat,
        properties: {
          ...feat.properties,
          isCurrentActiveLeg: false,
          isSubsequentLeg: true,
        },
      });
      continue;
    }

    // 3. Current active leg
    const coords = feat.geometry?.coordinates || [];
    if (coords.length === 0) continue;

    if (!isNavigating) {
      // In preview mode: show entire first leg brightly and subsequent dimmed
      result.push({
        ...feat,
        properties: {
          ...feat.properties,
          isCurrentActiveLeg: legIdx === 0,
          isSubsequentLeg: legIdx > 0,
        },
      });
      continue;
    }

    // In driving / simulation mode: remove polyline behind vehicle
    let minD = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const d = getHaversineDistance(coords[i], vehicleCoords);
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    }

    if (!foundActiveSegment) {
      if (minD < 350) {
        foundActiveSegment = true;
        const sliced = coords.slice(closestIdx);
        const trimmedCoords = sliced.length > 0 ? [vehicleCoords, ...sliced] : [vehicleCoords];
        if (trimmedCoords.length > 1) {
          result.push({
            ...feat,
            properties: {
              ...feat.properties,
              isCurrentActiveLeg: true,
              isSubsequentLeg: false,
            },
            geometry: {
              type: 'LineString',
              coordinates: trimmedCoords,
            },
          });
        }
      }
      // If segment is before the vehicle, it's skipped (removed behind the car!)
    } else {
      // Segments ahead of vehicle in current active leg
      result.push({
        ...feat,
        properties: {
          ...feat.properties,
          isCurrentActiveLeg: true,
          isSubsequentLeg: false,
        },
      });
    }
  }

  // Fallback: If no segment was matched as current, include remaining legs
  if (isNavigating && !foundActiveSegment) {
    return features
      .filter((f) => (f.properties?.legIndex ?? 0) >= currentLegIndex)
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          isCurrentActiveLeg: (f.properties?.legIndex ?? 0) === currentLegIndex,
          isSubsequentLeg: (f.properties?.legIndex ?? 0) > currentLegIndex,
        },
      }));
  }

  return result;
}

export const MapboxCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
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
    waypoints,
    previewRouteTo,
    navStatus,
    allSteps,
    activeStepIndex,
  } = useNav();

  const currentLegIndex =
    navStatus === 'navigating' ? allSteps[activeStepIndex]?.legIndex ?? 0 : 0;

  // Initialize Mapbox 3D Standard Canvas
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setErrorMsg('Mapbox access token missing.');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const initialCenter: [number, number] =
        coords && coords[0] !== 0 ? [coords[0], coords[1]] : [55.3781, 25.3223];

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: initialCenter,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        attributionControl: false,
        fadeDuration: 0,
      });

      map.on('style.load', () => {
        try {
          const preset = getComputedLightPreset();
          map.setConfigProperty('basemap', 'lightPreset', preset);
          map.setConfigProperty('basemap', 'showPlaceLabels', true);
          map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
          map.setConfigProperty('basemap', 'showTransitLabels', true);
        } catch {
          // Standard style config fallback
        }
      });

      // Interactive Alternative Route Selection
      map.on('click', 'alt-routes-hitbox', (e) => {
        if (e.features && e.features.length > 0) {
          const clickedRouteId = (e.features[0] as any)?.properties?.routeId;
          if (typeof clickedRouteId === 'number') {
            selectRoute(clickedRouteId);
          }
        }
      });

      map.on('mouseenter', 'alt-routes-hitbox', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'alt-routes-hitbox', () => {
        map.getCanvas().style.cursor = '';
      });

      // Quick POI Tap-to-Route
      map.on('click', (e) => {
        const poiFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['poi-label', 'transit-label'],
        });

        if (poiFeatures.length > 0) {
          const poi = poiFeatures[0] as any;
          const poiName = poi?.properties?.name || 'Selected POI';
          const poiLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          previewRouteTo(poiLngLat, poiName);
        }
      });

      mapRef.current = map;
      setMapInstance(map);
    } catch (err: any) {
      console.error('Error initializing map:', err);
      setErrorMsg(err?.message || 'Failed to initialize Mapbox.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
      }
    };
  }, []);

  // Update Driver Vehicle Puck (Live GPS or Simulated navigation step)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const targetCoords = vehicleCoords || coords;
    if (!targetCoords || (targetCoords[0] === 0 && targetCoords[1] === 0)) return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'vehicle-puck relative flex items-center justify-center pointer-events-none';
      el.style.width = '38px';
      el.style.height = '38px';
      el.innerHTML = `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-sky-500/25 animate-ping"></div>
          <div class="relative w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-[0_0_16px_rgba(14,165,233,0.9)] flex items-center justify-center transition-transform duration-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" class="drop-shadow-sm">
              <path d="M12 2L2 22L12 18L22 22L12 2Z"/>
            </svg>
          </div>
        </div>
      `;

      markerRef.current = new mapboxgl.Marker({
        element: el,
        rotationAlignment: 'map',
      })
        .setLngLat(targetCoords)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(targetCoords);
      markerRef.current.setRotation(vehicleHeading || 0);
    }
  }, [vehicleCoords, coords, vehicleHeading]);

  // Update Destination Pin Marker (Google Maps Red Pin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && navStatus !== 'idle') {
      if (!destMarkerRef.current) {
        const destEl = document.createElement('div');
        destEl.className = 'cursor-pointer select-none filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]';
        destEl.innerHTML = `
          <svg width="28" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 26.5 14.2 39 15.2 39.7C15.6 40.1 16.4 40.1 16.8 39.7C17.8 39 32 26.5 32 16C32 7.163 24.837 0 16 0Z" fill="#EA4335"/>
            <path d="M16 2C8.268 2 2 8.268 2 16C2 25 14.5 36.5 16 37.8C17.5 36.5 30 25 30 16C30 8.268 23.732 2 16 2Z" fill="#D93025"/>
            <circle cx="16" cy="15" r="5.5" fill="#781005"/>
            <circle cx="16" cy="15" r="4.2" fill="#FFFFFF"/>
          </svg>
        `;

        destMarkerRef.current = new mapboxgl.Marker({ element: destEl, offset: [0, -18] })
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

  // Update intermediate waypoint pin markers (auto-remove reached stops)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old waypoint markers
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    if (navStatus !== 'idle' && waypoints.length > 0) {
      const newMarkers = waypoints
        .map((wp, idx) => {
          // If navigating and this stop has already been reached in the past, hide its pin
          if (navStatus === 'navigating' && idx < currentLegIndex) {
            return null;
          }

          const wpEl = document.createElement('div');
          wpEl.className =
            'w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-[0_0_10px_rgba(245,158,11,0.8)] flex items-center justify-center text-black font-black text-xs font-mono select-none';
          wpEl.innerText = `${idx + 1}`;

          return new mapboxgl.Marker({ element: wpEl })
            .setLngLat(wp.coordinates)
            .addTo(map);
        })
        .filter(Boolean) as mapboxgl.Marker[];
      waypointMarkersRef.current = newMarkers;
    }
  }, [waypoints, navStatus, currentLegIndex]);

  // Render & update live Route GeoJSON lines (Active Traffic Ribbon + Alternative Routes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const altSourceId = 'alt-routes-source';
    const altLayerId = 'alt-routes-layer';
    const altHitboxLayerId = 'alt-routes-hitbox';
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

        // Visible Muted Dark Blue alternative route line
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
            'line-color': '#1d4ed8',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 3.5,
              14, 5.5,
              17, 7.5,
            ],
            'line-opacity': 0.85,
            'line-emissive-strength': 0.65,
          },
        });

        // Invisible extra-wide 72px tap hitbox layer for effortless in-car touch selection
        map.addLayer({
          id: altHitboxLayerId,
          type: 'line',
          source: altSourceId,
          slot: 'middle',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 72,
            'line-opacity': 0.001,
          },
        });
      }

      // 2. Render Active Route Line with breadcrumb trailing removal & heavily dimmed subsequent legs
      const processedFeatures = processActiveRouteGeoJson(
        activeRoute.geoJson?.features || [],
        currentLegIndex,
        vehicleCoords || coords,
        navStatus === 'navigating'
      );

      const activeGeoJson = {
        type: 'FeatureCollection',
        features: processedFeatures,
      };

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
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              '#090d16',
              [
                'match',
                ['get', 'congestion'],
                'moderate', '#b45309',
                'heavy', '#b91c1c',
                'severe', '#7f1d1d',
                '#0284c7',
              ],
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 5.0,
              14, 7.0,
              17, 9.5,
            ],
            'line-opacity': [
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              0.15,
              0.9,
            ],
            'line-blur': 0,
            'line-emissive-strength': [
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              0.05,
              0.8,
            ],
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
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              '#1e293b',
              [
                'match',
                ['get', 'congestion'],
                'moderate', '#f59e0b',
                'heavy', '#ef4444',
                'severe', '#dc2626',
                '#0ea5e9',
              ],
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 3.2,
              14, 4.8,
              17, 6.8,
            ],
            'line-opacity': [
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              0.25,
              1.0,
            ],
            'line-emissive-strength': [
              'case',
              ['==', ['get', 'isSubsequentLeg'], true],
              0.05,
              1.0,
            ],
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
            r.rawGeometry?.coordinates?.forEach((coord) => {
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
      if (map.getLayer(altHitboxLayerId)) map.removeLayer(altHitboxLayerId);
      if (map.getLayer(altLayerId)) map.removeLayer(altLayerId);
      if (map.getSource(altSourceId)) map.removeSource(altSourceId);
    }
  }, [
    activeRoute,
    availableRoutes,
    selectedRouteIndex,
    navStatus,
    currentLegIndex,
    vehicleCoords,
    coords,
  ]);

  // Trigger smooth resize on view-state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [isNavExpanded]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#090a0f]">
      {/* 3D Mapbox Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Subtle vignette border overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_28px_rgba(0,0,0,0.5)] z-10" />

      {/* Error Fallback */}
      {errorMsg && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="max-w-md p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
            <h3 className="text-lg font-bold text-red-400 mb-2 font-sf">
              Map Configuration Error
            </h3>
            <p className="text-xs text-white/80 font-sf leading-relaxed mb-4">
              {errorMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
