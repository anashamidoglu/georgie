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

function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; t: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { point: a, t: 0 };
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return {
    point: [a[0] + t * dx, a[1] + t * dy],
    t,
  };
}

function processActiveRouteGeoJson(
  features: any[],
  currentLegIndex: number,
  vehicleCoords: [number, number],
  isNavigating: boolean
): any[] {
  if (!features || features.length === 0) return [];

  if (!isNavigating) {
    return features.map((feat) => {
      const legIdx = feat.properties?.legIndex ?? 0;
      return {
        ...feat,
        properties: {
          ...feat.properties,
          isCurrentActiveLeg: legIdx === 0,
          isSubsequentLeg: legIdx > 0,
        },
      };
    });
  }

  const result: any[] = [];
  let bestFeatIdx = -1;
  let bestSegIdx = -1;
  let bestDist = Infinity;
  let bestProj: [number, number] = vehicleCoords;

  features.forEach((feat, fIdx) => {
    const legIdx = feat.properties?.legIndex ?? 0;
    if (legIdx === currentLegIndex) {
      const coords = feat.geometry?.coordinates || [];
      for (let i = 0; i < coords.length - 1; i++) {
        const { point } = projectPointOnSegment(vehicleCoords, coords[i], coords[i + 1]);
        const d = getHaversineDistance(vehicleCoords, point);
        if (d < bestDist) {
          bestDist = d;
          bestFeatIdx = fIdx;
          bestSegIdx = i;
          bestProj = point;
        }
      }
    }
  });

  // If vehicle is reasonably near the current route (within 150m)
  if (bestFeatIdx !== -1 && bestDist < 150) {
    features.forEach((feat, fIdx) => {
      const legIdx = feat.properties?.legIndex ?? 0;
      if (legIdx < currentLegIndex) return; // Drop past legs

      if (legIdx > currentLegIndex) {
        result.push({
          ...feat,
          properties: {
            ...feat.properties,
            isCurrentActiveLeg: false,
            isSubsequentLeg: true,
          },
        });
        return;
      }

      if (fIdx < bestFeatIdx) {
        // Segments before vehicle -> dropped behind
        return;
      }

      if (fIdx === bestFeatIdx) {
        const coords = feat.geometry?.coordinates || [];
        const remainingCoords = [bestProj, ...coords.slice(bestSegIdx + 1)];
        if (remainingCoords.length >= 2) {
          result.push({
            ...feat,
            properties: {
              ...feat.properties,
              isCurrentActiveLeg: true,
              isSubsequentLeg: false,
            },
            geometry: {
              type: 'LineString',
              coordinates: remainingCoords,
            },
          });
        }
        return;
      }

      // Feature is ahead of vehicle in current leg
      result.push({
        ...feat,
        properties: {
          ...feat.properties,
          isCurrentActiveLeg: true,
          isSubsequentLeg: false,
        },
      });
    });
  } else {
    // Fallback: If at start or off-route, show all current and subsequent legs
    features.forEach((feat) => {
      const legIdx = feat.properties?.legIndex ?? 0;
      if (legIdx >= currentLegIndex) {
        result.push({
          ...feat,
          properties: {
            ...feat.properties,
            isCurrentActiveLeg: legIdx === currentLegIndex,
            isSubsequentLeg: legIdx > currentLegIndex,
          },
        });
      }
    });
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
    inspectedStep,
  } = useNav();

  const currentLegIndex =
    navStatus === 'navigating' ? allSteps[activeStepIndex]?.legIndex ?? 0 : 0;

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

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
        preserveDrawingBuffer: true,
        antialias: true,
      });

      map.on('style.load', () => {
        try {
          const preset = getComputedLightPreset();
          map.setConfigProperty('basemap', 'lightPreset', preset);
          map.setConfigProperty('basemap', 'showPlaceLabels', true);
          map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
          map.setConfigProperty('basemap', 'showTransitLabels', true);
        } catch {
        }
        setMapLoaded(true);
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

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
      setMapLoaded(true);
    } catch (err: any) {
      console.error('Error initializing map:', err);
      setErrorMsg(err?.message || 'Failed to initialize Mapbox.');
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      waypointMarkersRef.current.forEach((m) => m.remove());
      waypointMarkersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        setMapLoaded(false);
      }
    };
  }, []);

  // Update Driver Vehicle Puck (Live GPS or Simulated navigation step)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (vehicleCoords && vehicleCoords[0] !== 0) {
      if (!markerRef.current) {
        const el = document.createElement('div');
        el.className = 'vehicle-puck-container select-none';
        el.innerHTML = `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="puck-chevron w-7 h-7 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2L4 20L12 16.5L20 20L12 2Z" />
              </svg>
            </div>
          </div>
        `;
        markerRef.current = new mapboxgl.Marker({
          element: el,
          rotationAlignment: 'map',
        })
          .setLngLat(vehicleCoords)
          .addTo(map);
      } else {
        markerRef.current.setLngLat(vehicleCoords);
        markerRef.current.setRotation(vehicleHeading || 0);
      }
    }
  }, [vehicleCoords, coords, vehicleHeading, mapLoaded]);

  // Update Destination Pin Marker (Google Maps Red Pin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && navStatus !== 'idle') {
      if (!destMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'dest-pin-container select-none';
        el.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `;
        destMarkerRef.current = new mapboxgl.Marker({ element: el })
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

    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    if (navStatus !== 'idle' && waypoints.length > 0) {
      const newMarkers = waypoints
        .map((wp, idx) => {
          if (navStatus === 'navigating' && idx < currentLegIndex) {
            return null;
          }

          const wpEl = document.createElement('div');
          wpEl.className =
            'w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-black font-black text-xs font-mono select-none';
          wpEl.innerText = `${idx + 1}`;

          return new mapboxgl.Marker({ element: wpEl })
            .setLngLat(wp.coordinates)
            .addTo(map);
        })
        .filter(Boolean) as mapboxgl.Marker[];
      waypointMarkersRef.current = newMarkers;
    }
  }, [waypoints, navStatus, currentLegIndex]);

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
      // 1. Render Alternative Routes (ONLY in preview mode for candidate selection)
      const altFeatures: any[] = [];
      if (navStatus === 'preview') {
        availableRoutes.forEach((route, idx) => {
          if (idx !== selectedRouteIndex && route.rawGeometry) {
            altFeatures.push({
              type: 'Feature',
              properties: { routeId: idx },
              geometry: route.rawGeometry,
            });
          }
        });
      }

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

      // If in preview mode (and not actively inspecting a step), smoothly fit the whole route overview
      if (navStatus === 'preview' && !inspectedStep) {
        const coordinates = activeRoute.rawGeometry?.coordinates || [];
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0] as [number, number];
          const bounds = new mapboxgl.LngLatBounds(firstCoord, firstCoord);
          availableRoutes.forEach((r) => {
            r.rawGeometry?.coordinates?.forEach((coord: [number, number]) => {
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
    inspectedStep,
  ]);

  // Continuous ResizeObserver for silky-smooth CSS layout transitions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rAFId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rAFId) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rAFId) cancelAnimationFrame(rAFId);
    };
  }, [mapLoaded]);

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
