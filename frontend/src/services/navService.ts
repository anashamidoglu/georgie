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
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface RouteGeoJSON {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: RouteGeometry;
}

export interface RouteResult {
  geoJson: RouteGeoJSON;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  distanceStr: string;
  durationStr: string;
  arrivalStr: string;
  primaryManeuver: ManeuverInfo;
  upcomingSteps: ManeuverInfo[];
  allSteps: ManeuverInfo[];
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

function parseManeuverDetails(step: any): { lanes?: LaneInfo[]; shield?: string; exitNumber?: string } {
  if (!step) return {};
  const banners = step.bannerInstructions || [];

  // 1. Extract physical lanes strictly from Mapbox banner_instructions.sub.components (spec Section 5.2)
  let lanes: LaneInfo[] | undefined;
  for (const banner of banners) {
    const subComponents = banner?.sub?.components || [];
    const laneComps = subComponents.filter((c: any) => c.type === 'lane');
    if (laneComps.length > 0) {
      lanes = laneComps.map((comp: any) => ({
        active: Boolean(comp.active),
        valid: comp.valid !== false,
        directions: comp.directions || ['straight'],
        activeDirection: comp.active_direction,
      }));
      break;
    }
  }

  // 2. Extract Shield (e.g. E11, D71, S113, E311)
  let shield: string | undefined;
  for (const banner of banners) {
    const primaryComponents = banner?.primary?.components || [];
    for (const comp of primaryComponents) {
      if (comp.type === 'icon' && comp.mapbox_shield?.display_ref) {
        shield = comp.mapbox_shield.display_ref;
        break;
      } else if (comp.type === 'icon' && comp.text && comp.text.length <= 8) {
        shield = comp.text;
        break;
      }
    }
    if (shield) break;
  }

  // 3. Extract Exit Number (e.g. Exit 50, Exit 58B, Exit 29)
  let exitNumber: string | undefined;
  for (const banner of banners) {
    const primaryComponents = banner?.primary?.components || [];
    const exitNumComp = primaryComponents.find((c: any) => c.type === 'exit-number');
    if (exitNumComp?.text) {
      exitNumber = `Exit ${exitNumComp.text.replace(/exit\s*/i, '')}`;
      break;
    }
    const exitComp = primaryComponents.find((c: any) => c.type === 'exit');
    if (exitComp?.text && /\d+/.test(exitComp.text)) {
      exitNumber = exitComp.text;
      break;
    }
  }

  return {
    lanes,
    shield,
    exitNumber,
  };
}

export async function fetchDirections(
  origin: [number, number],
  destination: [number, number],
  accessToken: string,
  signal?: AbortSignal
): Promise<RouteResult> {
  const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;

  // Try Mapbox Driving Traffic first, fallback to standard Driving
  const profiles = ['driving-traffic', 'driving'];

  for (const profile of profiles) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?geometries=geojson&steps=true&banner_instructions=true&overview=full&access_token=${accessToken}`;
      const response = await fetch(url, { signal });
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
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

          const leg = route.legs?.[0];
          const steps = leg?.steps || [];

          const allSteps: ManeuverInfo[] = steps.map((step: any, idx: number) => {
            const stepDist = Math.round(step.distance);
            const stepDetails = parseManeuverDetails(step);
            const stepLoc: [number, number] = step.maneuver?.location || [origin[0], origin[1]];

            return {
              id: idx,
              instruction: step.maneuver?.instruction || step.bannerInstructions?.[0]?.primary?.text || 'Proceed on route',
              roadName: step.name || 'Road',
              distanceStr: stepDist >= 1000 ? `${(stepDist / 1000).toFixed(1)} km` : `${stepDist} m`,
              distanceMeters: stepDist,
              type: step.maneuver?.type || 'turn',
              modifier: step.maneuver?.modifier || 'straight',
              lanes: stepDetails.lanes,
              shield: stepDetails.shield,
              exitNumber: stepDetails.exitNumber,
              location: stepLoc,
            };
          });

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

          const geoJson: RouteGeoJSON = {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          };

          return {
            geoJson,
            totalDistanceMeters: distanceMeters,
            totalDurationSeconds: durationSec,
            distanceStr,
            durationStr,
            arrivalStr,
            primaryManeuver,
            upcomingSteps,
            allSteps,
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

  return {
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination],
      },
    },
    totalDistanceMeters: distMeters,
    totalDurationSeconds: estDurationSec,
    distanceStr: `${distKm} km`,
    durationStr: `${durMin} min`,
    arrivalStr: `${arrHours}:${arrMin} arrival`,
    primaryManeuver: fallbackStep,
    upcomingSteps: [],
    allSteps: [fallbackStep],
  };
}
