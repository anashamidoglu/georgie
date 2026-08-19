export interface LaneInfo {
  active: boolean;
  valid?: boolean;
  directions: string[];
  activeDirection?: string;
}

export interface ManeuverInfo {
  id: number;
  instruction: string;
  roadName: string;
  distanceStr: string;
  distanceMeters: number;
  type: string;
  modifier?: string;
  lanes?: LaneInfo[];
  shield?: string;
  exitNumber?: string;
  location: [number, number];
  legIndex?: number;
  isWaypointStop?: boolean;
  stopName?: string;
  bearingAfter?: number;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteGeoJSON {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: {
      congestion: 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';
      routeId?: number;
      isFirstLeg?: boolean;
      legIndex?: number;
    };
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  }[];
}

export interface TrafficInfo {
  condition: 'fast' | 'moderate' | 'slow';
  colorClass: string; // 'text-emerald-400' | 'text-amber-400' | 'text-red-400'
  badgeClass: string; // 'bg-emerald-500/20 text-emerald-300' etc.
  label: string;      // 'Fast route' | 'Moderate traffic' | 'Heavy traffic'
}

export interface RouteLegInfo {
  legIndex: number;
  summary: string;
  distanceStr: string;
  durationStr: string;
  destinationName: string;
  steps: ManeuverInfo[];
}

export interface RouteResult {
  id: number;
  summary: string;
  diffStr: string;
  traffic: TrafficInfo;
  geoJson: RouteGeoJSON;
  rawGeometry: RouteGeometry;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  distanceStr: string;
  durationStr: string;
  arrivalStr: string;
  primaryManeuver: ManeuverInfo;
  upcomingSteps: ManeuverInfo[];
  allSteps: ManeuverInfo[];
  legs?: RouteLegInfo[];
}

export interface DirectionsResponse {
  routes: RouteResult[];
  activeRoute: RouteResult;
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

function computeTraffic(congestion: string[] | undefined): TrafficInfo {
  if (!congestion || congestion.length === 0) {
    return {
      condition: 'fast',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      label: 'Fast route',
    };
  }

  const total = congestion.length;
  const heavy = congestion.filter((c) => c === 'heavy' || c === 'severe').length;
  const moderate = congestion.filter((c) => c === 'moderate').length;

  if (heavy / total > 0.08 || heavy >= 18) {
    return {
      condition: 'slow',
      colorClass: 'text-red-400',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
      label: 'Heavy traffic',
    };
  }

  if (moderate / total > 0.12 || (moderate + heavy) / total > 0.14) {
    return {
      condition: 'moderate',
      colorClass: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      label: 'Moderate traffic',
    };
  }

  return {
    condition: 'fast',
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    label: 'Typical traffic',
  };
}

function extractMajorRoads(steps: any[]): string {
  const allNames: string[] = [];
  steps.forEach((s) => {
    const bannerShield = s.bannerInstructions?.[0]?.primary?.components?.find(
      (c: any) => c.type === 'icon'
    )?.mapbox_shield?.display_ref;
    const name = bannerShield || s.name || s.bannerInstructions?.[0]?.primary?.text;
    if (
      name &&
      !/^\d+\s*street$/i.test(name) &&
      !/roundabout|turn|destination|bear|drive/i.test(name) &&
      name.length > 2
    ) {
      allNames.push(name);
    }
  });

  const majorPatterns = [
    /E\d+/i,
    /D\d+/i,
    /S\d+/i,
    /Sheikh/i,
    /Ittihad/i,
    /Tripoli/i,
    /Khawaneej/i,
    /Airport/i,
    /Baghdad/i,
    /Beirut/i,
    /Boulevard/i,
    /Highway/i,
    /Algeria/i,
  ];

  const major = allNames.filter((n) => majorPatterns.some((p) => p.test(n)));
  const unique = [...new Set(major.length > 0 ? major : allNames)];
  return unique.slice(0, 2).join(' / ') || 'Direct Route';
}

function buildCongestionGeoJSON(route: any, routeId: number): RouteGeoJSON {
  const features: any[] = [];
  const legs = route.legs || [];

  if (legs.length === 0) {
    const coords: [number, number][] = route.geometry?.coordinates || [];
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { congestion: 'low', routeId, isFirstLeg: true },
          geometry: { type: 'LineString', coordinates: coords },
        },
      ],
    };
  }

  // Iterate over each leg to enable dimming for subsequent legs
  legs.forEach((leg: any, legIdx: number) => {
    const isFirstLeg = legIdx === 0;
    const legCoords: [number, number][] = [];
    (leg.steps || []).forEach((step: any) => {
      if (step.geometry?.coordinates) {
        step.geometry.coordinates.forEach((c: [number, number]) => {
          if (
            legCoords.length === 0 ||
            legCoords[legCoords.length - 1][0] !== c[0] ||
            legCoords[legCoords.length - 1][1] !== c[1]
          ) {
            legCoords.push(c);
          }
        });
      }
    });

    const coordsToUse = legCoords.length > 1 ? legCoords : route.geometry?.coordinates || [];
    const congestion: string[] = leg.annotation?.congestion || [];

    if (!congestion || congestion.length === 0) {
      features.push({
        type: 'Feature',
        properties: { congestion: 'low', routeId, isFirstLeg, legIndex: legIdx },
        geometry: { type: 'LineString', coordinates: coordsToUse },
      });
      return;
    }

    let currentLevel = (congestion[0] || 'low') as any;
    let currentCoords: [number, number][] = [coordsToUse[0]];

    for (let i = 0; i < congestion.length; i++) {
      const level = (congestion[i] || 'low') as any;
      const nextCoord = coordsToUse[i + 1] || coordsToUse[i];

      if (level === currentLevel) {
        currentCoords.push(nextCoord);
      } else {
        currentCoords.push(nextCoord);
        features.push({
          type: 'Feature',
          properties: { congestion: currentLevel, routeId, isFirstLeg, legIndex: legIdx },
          geometry: { type: 'LineString', coordinates: currentCoords },
        });
        currentLevel = level;
        currentCoords = [coordsToUse[i] || nextCoord, nextCoord];
      }
    }

    if (currentCoords.length > 1) {
      features.push({
        type: 'Feature',
        properties: { congestion: currentLevel, routeId, isFirstLeg, legIndex: legIdx },
        geometry: { type: 'LineString', coordinates: currentCoords },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

function parseManeuverStep(
  step: any,
  nextStep: any,
  idx: number,
  originCoords: [number, number],
  legIndex?: number,
  isWaypointStop?: boolean,
  stopName?: string
): ManeuverInfo {
  const stepDist = Math.round(step.distance);
  const distanceStr =
    stepDist >= 1000 ? `${(stepDist / 1000).toFixed(1)} km` : `${stepDist} m`;

  const bannerPrimary = step.bannerInstructions?.[0]?.primary;
  const bannerSub = step.bannerInstructions?.[0]?.sub;

  const rawType = bannerPrimary?.type || step.maneuver?.type || 'turn';
  const rawModifier = bannerPrimary?.modifier || step.maneuver?.modifier || 'straight';

  let type = rawType;
  let modifier = rawModifier;

  if (isWaypointStop && stopName) {
    type = 'destination';
    modifier = 'destination';
  }

  const instruction = isWaypointStop && stopName
    ? `${stopName} reached`
    : step.maneuver?.instruction ||
      bannerPrimary?.text ||
      (step.name ? `Continue onto ${step.name}` : 'Continue on route');

  const roadName =
    step.name ||
    bannerPrimary?.components?.find((c: any) => c.type === 'text')?.text ||
    nextStep?.name ||
    '';

  const rawShield =
    bannerPrimary?.components?.find((c: any) => c.type === 'icon')?.mapbox_shield?.display_ref ||
    step.bannerInstructions?.[0]?.primary?.components?.find((c: any) => c.mapbox_shield)?.mapbox_shield?.display_ref ||
    (step as any).ref;

  const explicitShield = typeof rawShield === 'string' ? rawShield : typeof rawShield === 'number' ? String(rawShield) : '';

  // Fallback regex match for UAE E/D/S road numbers in roadName or instruction (e.g. "E11", "D71", "S116", "E 311")
  const matchedShield =
    explicitShield ||
    (typeof roadName === 'string' ? roadName.match(/\b([EDS]\s?\d{1,4})\b/i)?.[1] : null) ||
    (typeof instruction === 'string' ? instruction.match(/\b([EDS]\s?\d{1,4})\b/i)?.[1] : null);

  const shield =
    typeof matchedShield === 'string' && matchedShield.trim().length > 0
      ? matchedShield.toUpperCase().replace(/\s+/, '')
      : undefined;

  const isRoundabout =
    rawType.includes('roundabout') ||
    rawType.includes('rotary') ||
    (typeof instruction === 'string' && instruction.toLowerCase().includes('roundabout'));

  let exitNumber: string | undefined = undefined;

  if (!isRoundabout) {
    const rawExit =
      bannerPrimary?.components?.find((c: any) => c.type === 'exit-number')?.text ||
      step.maneuver?.exit;

    const explicitExit =
      typeof rawExit === 'string'
        ? rawExit
        : typeof rawExit === 'number'
        ? `Exit ${rawExit}`
        : '';

    const matchedExit =
      explicitExit ||
      (typeof instruction === 'string' ? instruction.match(/\bExit\s*(\d{1,4}[A-Za-z]?)\b/i)?.[0] : null) ||
      (typeof roadName === 'string' ? roadName.match(/\bExit\s*(\d{1,4}[A-Za-z]?)\b/i)?.[0] : null);

    exitNumber =
      typeof matchedExit === 'string' && matchedExit.trim().length > 0
        ? matchedExit
        : undefined;
  }

  let lanes: LaneInfo[] | undefined;
  if (bannerSub?.components) {
    const laneComponents = bannerSub.components.filter((c: any) => c.type === 'lane');
    if (laneComponents.length > 0) {
      lanes = laneComponents.map((lc: any) => ({
        active: Boolean(lc.active),
        valid: lc.valid !== false,
        directions: lc.directions || [lc.active_direction || 'straight'],
        activeDirection: lc.active_direction,
      }));
    }
  }

  const location: [number, number] = step.maneuver?.location || originCoords;
  const bearingAfter =
    typeof step.maneuver?.bearing_after === 'number' ? step.maneuver.bearing_after : undefined;

  return {
    id: idx,
    instruction,
    roadName,
    distanceStr,
    distanceMeters: stepDist,
    type,
    modifier,
    lanes,
    shield,
    exitNumber,
    location,
    legIndex,
    isWaypointStop,
    stopName,
    bearingAfter,
  };
}

export async function fetchDirections(
  origin: [number, number],
  destination: [number, number],
  waypoints: [number, number][] = [],
  accessToken: string,
  signal?: AbortSignal,
  destinationName: string = 'Destination',
  waypointNames: string[] = []
): Promise<DirectionsResponse> {
  const points = [origin, ...waypoints, destination];
  const coordinates = points.map((p) => `${p[0]},${p[1]}`).join(';');
  const allowAlternatives = waypoints.length === 0;

  // Driving traffic profile with alternatives and segment congestion annotations
  const profiles = ['driving-traffic', 'driving'];

  for (const profile of profiles) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?alternatives=${allowAlternatives}&annotations=congestion,distance,duration&geometries=geojson&steps=true&banner_instructions=true&overview=full&access_token=${accessToken}`;
      const response = await fetch(url, { signal });
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const fastestDuration = data.routes[0].duration;

          const parsedRoutes: RouteResult[] = data.routes.map((route: any, routeIdx: number) => {
            const durationSec = Math.round(route.duration);
            const distanceMeters = Math.round(route.distance);

            const distanceStr =
              distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)} km`
                : `${distanceMeters} m`;

            const durationMin = Math.round(durationSec / 60);
            const durationStr =
              durationMin >= 60
                ? `${Math.floor(durationMin / 60)} hr ${durationMin % 60} min`
                : `${durationMin} min`;

            const now = new Date();
            const arrivalDate = new Date(now.getTime() + durationSec * 1000);
            const arrivalHours = arrivalDate.getHours().toString().padStart(2, '0');
            const arrivalMinutes = arrivalDate.getMinutes().toString().padStart(2, '0');
            const arrivalStr = `${arrivalHours}:${arrivalMinutes} arrival`;

            // Process individual legs for per-stop dropdowns & next stop banners
            const legsInfo: RouteLegInfo[] = [];
            const allSteps: ManeuverInfo[] = [];
            let globalStepIdx = 0;

            const legs = route.legs || [];
            legs.forEach((leg: any, legIdx: number) => {
              const legDistMeters = Math.round(leg.distance || 0);
              const legDistStr =
                legDistMeters >= 1000 ? `${(legDistMeters / 1000).toFixed(1)} km` : `${legDistMeters} m`;
              const legDurMin = Math.round((leg.duration || 0) / 60);
              const legDurStr =
                legDurMin >= 60
                  ? `${Math.floor(legDurMin / 60)} hr ${legDurMin % 60} min`
                  : `${legDurMin} min`;

              const legDestName =
                legIdx < waypoints.length
                  ? waypointNames[legIdx] || `Stop ${legIdx + 1}`
                  : destinationName;

              const legRawSteps = leg.steps || [];
              const legManeuvers: ManeuverInfo[] = [];

              legRawSteps.forEach((step: any, sIdx: number) => {
                const isLastStepOfIntermediateLeg =
                  legIdx < legs.length - 1 && sIdx === legRawSteps.length - 1;

                const parsed = parseManeuverStep(
                  step,
                  legRawSteps[sIdx + 1],
                  globalStepIdx++,
                  origin,
                  legIdx,
                  isLastStepOfIntermediateLeg,
                  isLastStepOfIntermediateLeg ? legDestName : undefined
                );
                legManeuvers.push(parsed);
                allSteps.push(parsed);
              });

              legsInfo.push({
                legIndex: legIdx,
                summary: extractMajorRoads(legRawSteps),
                distanceStr: legDistStr,
                durationStr: legDurStr,
                destinationName: legDestName,
                steps: legManeuvers,
              });
            });

            // Highway & arterial road summary label
            const summary = extractMajorRoads(
              route.legs?.flatMap((l: any) => l.steps || []) || []
            );

            // Relative diff string
            const diffMin = Math.round((route.duration - fastestDuration) / 60);
            const diffStr = routeIdx === 0 || diffMin <= 0 ? 'Fastest' : `+${diffMin} min`;

            // Traffic condition and color
            const allCongestions: string[] = [];
            (route.legs || []).forEach((leg: any) => {
              if (leg.annotation?.congestion) {
                allCongestions.push(...leg.annotation.congestion);
              }
            });
            const traffic = computeTraffic(allCongestions);

            const primaryManeuver = allSteps[0] || {
              id: 0,
              instruction: 'Proceed on route',
              roadName: 'Current Road',
              distanceStr: '500 m',
              distanceMeters: 500,
              type: 'straight',
              modifier: 'straight',
              location: origin,
            };

            const upcomingSteps = allSteps.slice(1);
            const geoJson = buildCongestionGeoJSON(route, routeIdx);

            return {
              id: routeIdx,
              summary,
              diffStr,
              traffic,
              geoJson,
              rawGeometry: route.geometry,
              totalDistanceMeters: distanceMeters,
              totalDurationSeconds: durationSec,
              distanceStr,
              durationStr,
              arrivalStr,
              primaryManeuver,
              upcomingSteps,
              allSteps,
              legs: legsInfo,
            };
          });

          return {
            routes: parsedRoutes,
            activeRoute: parsedRoutes[0],
          };
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      console.warn(`Routing attempt with profile ${profile} failed:`, error);
    }
  }

  // Fallback calculation if completely offline
  const distMeters = Math.max(800, getHaversineDistance(origin, destination));
  const estDurationSec = Math.round(distMeters / 13.8);
  const distKm = (distMeters / 1000).toFixed(1);
  const durMin = Math.max(1, Math.round(estDurationSec / 60));

  const now = new Date();
  const arrivalDate = new Date(now.getTime() + estDurationSec * 1000);
  const arrHours = arrivalDate.getHours().toString().padStart(2, '0');
  const arrMin = arrivalDate.getMinutes().toString().padStart(2, '0');

  const fallbackStep: ManeuverInfo = {
    id: 0,
    instruction: 'Proceed to destination',
    roadName: 'Main Road',
    distanceStr: `${distKm} km`,
    distanceMeters: distMeters,
    type: 'turn',
    modifier: 'straight',
    location: origin,
  };

  const fallbackRoute: RouteResult = {
    id: 0,
    summary: 'Direct Route',
    diffStr: 'Fastest',
    traffic: {
      condition: 'fast',
      colorClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      label: 'Typical traffic',
    },
    geoJson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { congestion: 'low', routeId: 0, isFirstLeg: true },
          geometry: {
            type: 'LineString',
            coordinates: [origin, destination],
          },
        },
      ],
    },
    rawGeometry: {
      type: 'LineString',
      coordinates: [origin, destination],
    },
    totalDistanceMeters: distMeters,
    totalDurationSeconds: estDurationSec,
    distanceStr: `${distKm} km`,
    durationStr: `${durMin} min`,
    arrivalStr: `${arrHours}:${arrMin} arrival`,
    primaryManeuver: fallbackStep,
    upcomingSteps: [],
    allSteps: [fallbackStep],
    legs: [
      {
        legIndex: 0,
        summary: 'Direct Route',
        distanceStr: `${distKm} km`,
        durationStr: `${durMin} min`,
        destinationName: destinationName || 'Destination',
        steps: [fallbackStep],
      },
    ],
  };

  return {
    routes: [fallbackRoute],
    activeRoute: fallbackRoute,
  };
}
