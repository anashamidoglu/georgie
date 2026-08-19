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
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
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
    incidents,
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
      incidentMarkersRef.current.forEach((m) => m.remove());
      incidentMarkersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        setMapLoaded(false);
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const targetCoords: [number, number] =
      vehicleCoords && vehicleCoords[0] !== 0
        ? vehicleCoords
        : coords && coords[0] !== 0
        ? coords
        : [55.3781, 25.3223];

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'vehicle-puck relative flex items-center justify-center pointer-events-none z-30';
      el.style.width = '38px';
      el.style.height = '38px';
      el.innerHTML = `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-md flex items-center justify-center transition-transform duration-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
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
  }, [vehicleCoords, coords, vehicleHeading, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && navStatus !== 'idle') {
      if (!destMarkerRef.current) {
        const destEl = document.createElement('div');
        destEl.className = 'cursor-pointer select-none filter drop-shadow-md';
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
    if (!map) return;

    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];

    if (navStatus !== 'idle' && incidents && incidents.length > 0) {
      const markers = incidents.map((inc) => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer select-none transition-transform hover:scale-110 active:scale-95';

        let bgClass = 'bg-red-600 border-white text-white';
        let iconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>';

        if (inc.type === 'accident') {
          bgClass = 'bg-red-600 border-white text-white';
          iconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-.8 2-2 4-4 6-2.5 2.5-3 5.5-1.5 8.5 1.5 3 4.5 4.5 7.5 4.5 3.5 0 6.5-2.5 7-6 .5-4.5-3-8-5-10-.5 1-1.5 2-2.5 2.5.5-2 0-4-1.5-5.5z"/></svg>';
        } else if (inc.type === 'roadwork') {
          bgClass = 'bg-amber-500 border-white text-black';
          iconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7M7 14v7M14 6L10 14M6 6L2 14M22 6L18 14"/></svg>';
        } else if (inc.type === 'closure') {
          bgClass = 'bg-rose-700 border-white text-white';
          iconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>';
        }

        el.innerHTML = `
          <div class="w-6 h-6 rounded-full border-2 shadow-md flex items-center justify-center ${bgClass}">
            ${iconSvg}
          </div>
        `;

        const delayMinutes = Math.round((inc.delaySeconds || 0) / 60);
        const popupHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px 10px; color: #ffffff; background: #12131a; border-radius: 12px; font-size: 12px; line-height: 1.4; max-width: 220px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${inc.title}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 11px; margin-bottom: 4px;">${inc.description}</div>
            ${delayMinutes > 0 ? `<div style="color: #fbbf24; font-weight: 700; font-size: 11px;">+${delayMinutes} min delay</div>` : ''}
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 14,
          closeButton: false,
          className: 'incident-popup-clean',
        }).setHTML(popupHtml);

        return new mapboxgl.Marker({ element: el })
          .setLngLat(inc.location)
          .setPopup(popup)
          .addTo(map);
      });

      incidentMarkersRef.current = markers;
    }
  }, [incidents, navStatus]);

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
