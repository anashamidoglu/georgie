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
  prevStep: any,
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
  const prevBannerPrimary = prevStep?.bannerInstructions?.[0]?.primary;
  const bannerSub = step.bannerInstructions?.[0]?.sub;

  const rawType = step.maneuver?.type || bannerPrimary?.type || 'turn';
  const rawModifier = step.maneuver?.modifier || bannerPrimary?.modifier || 'straight';

  const instruction = isWaypointStop && stopName
    ? `${stopName} reached`
    : step.maneuver?.instruction ||
      bannerPrimary?.text ||
      (step.name ? `Continue onto ${step.name}` : 'Continue on route');

  let type = rawType;
  let modifier = rawModifier;

  // Strict synchronization: guarantee that arrow matches the actual turn direction in instruction
  const instrLower = (instruction || '').toLowerCase();
  if (instrLower.includes('roundabout') || instrLower.includes('rotary')) {
    type = 'roundabout';
  } else if (type === 'roundabout' && !instrLower.includes('roundabout') && !instrLower.includes('rotary')) {
    type = 'turn';
  }

  if (instrLower.includes('u-turn') || instrLower.includes('uturn')) {
    modifier = 'uturn';
  } else if (instrLower.includes('sharp right')) {
    modifier = 'sharp right';
  } else if (instrLower.includes('sharp left')) {
    modifier = 'sharp left';
  } else if (instrLower.includes('slight right') || instrLower.includes('keep right') || instrLower.includes('bear right')) {
    modifier = 'slight right';
  } else if (instrLower.includes('slight left') || instrLower.includes('keep left') || instrLower.includes('bear left')) {
    modifier = 'slight left';
  } else if (instrLower.includes('turn right') || instrLower.includes('right onto') || instrLower.includes('take the right') || instrLower.startsWith('turn right')) {
    modifier = 'right';
  } else if (instrLower.includes('turn left') || instrLower.includes('left onto') || instrLower.includes('take the left') || instrLower.startsWith('turn left')) {
    modifier = 'left';
  }

  if (isWaypointStop && stopName) {
    type = 'destination';
    modifier = 'destination';
  }

  const roadName =
    step.name ||
    bannerPrimary?.components?.find((c: any) => c.type === 'text')?.text ||
    nextStep?.name ||
    '';

  // 1. Resolve Road Shield: prioritize current step instruction & ref, then approaching banner
  const instructionShield = typeof instruction === 'string' ? instruction.match(/\b([EDS]\s?\d{1,4})\b/i)?.[1] : null;
  const refShield = (step as any).ref && typeof (step as any).ref === 'string' ? (step as any).ref.match(/\b([EDS]\s?\d{1,4})\b/i)?.[1] : null;
  const prevBannerShield = prevBannerPrimary?.components?.find((c: any) => c.type === 'icon')?.mapbox_shield?.display_ref;
  const roadNameShield = typeof roadName === 'string' ? roadName.match(/\b([EDS]\s?\d{1,4})\b/i)?.[1] : null;

  const matchedShield = instructionShield || refShield || prevBannerShield || roadNameShield;
  const shield =
    typeof matchedShield === 'string' && matchedShield.trim().length > 0
      ? matchedShield.toUpperCase().replace(/\s+/, '')
      : undefined;

  // 2. Resolve Exit Shield: only when explicitly part of this maneuver, never on roundabouts
  const isRoundabout =
    rawType.includes('roundabout') ||
    rawType.includes('rotary') ||
    (typeof instruction === 'string' && instruction.toLowerCase().includes('roundabout'));

  let exitNumber: string | undefined = undefined;

  if (!isRoundabout) {
    const instructionExit = typeof instruction === 'string' ? instruction.match(/\bExit\s*(\d{1,4}[A-Za-z]?)\b/i)?.[0] : null;
    const prevBannerExit = prevBannerPrimary?.components?.find((c: any) => c.type === 'exit-number')?.text;
    const roadNameExit = typeof roadName === 'string' ? roadName.match(/\bExit\s*(\d{1,4}[A-Za-z]?)\b/i)?.[0] : null;

    const matchedExit = instructionExit || (instruction.toLowerCase().includes('exit') ? prevBannerExit : null) || roadNameExit;

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
            let arrH = arrivalDate.getHours();
            const arrM = arrivalDate.getMinutes().toString().padStart(2, '0');
            const arrPeriod = arrH >= 12 ? 'PM' : 'AM';
            arrH = arrH % 12 || 12;
            const arrivalStr = `${arrH}:${arrM} ${arrPeriod}`;

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
                  legRawSteps[sIdx - 1],
                  globalStepIdx++,
                  origin,
                  legIdx,
                  isLastStepOfIntermediateLeg,
                  isLastStepOfIntermediateLeg ? legDestName : undefined
                );
                legManeuvers.push(parsed);
                allSteps.push(parsed);

                // If this step is a roundabout, synthesize the intermediate Roundabout Exit maneuver step
                if (
                  parsed.type === 'roundabout' &&
                  step.distance >= 15 &&
                  sIdx < legRawSteps.length - 1
                ) {
                  const nextRaw = legRawSteps[sIdx + 1];
                  const exitMatch = parsed.instruction.match(/(\d+(?:st|nd|rd|th)?)\s*exit/i);
                  const exitOrdinal = exitMatch ? exitMatch[0] : 'exit';
                  const exitRoad = nextRaw?.name || parsed.roadName || '';
                  const exitInstruction = exitRoad
                    ? `Take the ${exitOrdinal} onto ${exitRoad}`
                    : `Take the ${exitOrdinal}`;

                  const exitDistMeters = Math.round(step.distance);
                  const exitDistStr =
                    exitDistMeters >= 1000 ? `${(exitDistMeters / 1000).toFixed(1)} km` : `${exitDistMeters} m`;

                  const exitManeuver: ManeuverInfo = {
                    id: globalStepIdx++,
                    instruction: exitInstruction,
                    roadName: exitRoad,
                    distanceStr: exitDistStr,
                    distanceMeters: exitDistMeters,
                    type: 'roundabout-exit',
                    modifier: parsed.modifier || 'right',
                    shield: parsed.shield,
                    location: nextRaw?.maneuver?.location || parsed.location,
                    legIndex: legIdx,
                    bearingAfter: nextRaw?.maneuver?.bearing_after,
                  };
                  legManeuvers.push(exitManeuver);
                  allSteps.push(exitManeuver);
                }
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
  let arrH = arrivalDate.getHours();
  const arrMin = arrivalDate.getMinutes().toString().padStart(2, '0');
  const arrPeriod = arrH >= 12 ? 'PM' : 'AM';
  arrH = arrH % 12 || 12;
  const arrHours = `${arrH}:${arrMin} ${arrPeriod}`;

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

/**
 * Calculates perpendicular cross-track distance in meters from a point to the closest line segment on a route polyline
 */
export function calculateCrossTrackDistance(
  point: [number, number],
  routeCoords: [number, number][]
): number {
  if (!point || !routeCoords || routeCoords.length < 2) return 0;

  let minDistance = Infinity;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const p1 = routeCoords[i];
    const p2 = routeCoords[i + 1];

    const l2 = getHaversineDistance(p1, p2);
    if (l2 === 0) {
      const d = getHaversineDistance(point, p1);
      if (d < minDistance) minDistance = d;
      continue;
    }

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const t = Math.max(0, Math.min(1, ((point[0] - p1[0]) * dx + (point[1] - p1[1]) * dy) / (dx * dx + dy * dy)));
    const projection: [number, number] = [p1[0] + t * dx, p1[1] + t * dy];
    const dist = getHaversineDistance(point, projection);

    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Checks if the vehicle has deviated off the planned route corridor or missed a turn
 */
export function checkOffRouteStatus(
  vehicleCoords: [number, number],
  routeCoords: [number, number][],
  thresholdMeters = 35
): { isOffRoute: boolean; crossTrackDistance: number } {
  const crossTrackDistance = calculateCrossTrackDistance(vehicleCoords, routeCoords);
  return {
    isOffRoute: crossTrackDistance > thresholdMeters,
    crossTrackDistance: Math.round(crossTrackDistance),
  };
}

