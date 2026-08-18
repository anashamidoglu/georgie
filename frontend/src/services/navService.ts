export interface ManeuverInfo {
  instruction: string;
  roadName: string;
  distanceStr: string;
  type: string;
  modifier?: string;
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
}

export async function fetchDirections(
  origin: [number, number],
  destination: [number, number],
  accessToken: string,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  try {
    const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?geometries=geojson&steps=true&banner_instructions=true&overview=full&access_token=${accessToken}`;

    const response = await fetch(url, { signal });
    if (!response.ok) {
      console.error('Directions API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const durationSec = Math.round(route.duration);
    const distanceMeters = Math.round(route.distance);

    // Format distance (e.g. "1.5 km" or "850 m")
    const distanceStr =
      distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${distanceMeters} m`;

    // Format duration (e.g. "20 min" or "1 hr 15 min")
    const durationMin = Math.round(durationSec / 60);
    const durationStr =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)} hr ${durationMin % 60} min`
        : `${durationMin} min`;

    // Compute arrival time
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + durationSec * 1000);
    const arrivalHours = arrivalDate.getHours().toString().padStart(2, '0');
    const arrivalMinutes = arrivalDate.getMinutes().toString().padStart(2, '0');
    const arrivalStr = `${arrivalHours}:${arrivalMinutes} arrival`;

    // Extract first step banner instructions
    const leg = route.legs?.[0];
    const steps = leg?.steps || [];
    const firstStep = steps[0];
    const banner = firstStep?.bannerInstructions?.[0]?.primary;

    const primaryManeuver: ManeuverInfo = {
      instruction: banner?.text || firstStep?.maneuver?.instruction || 'Proceed on route',
      roadName: firstStep?.name || 'Current Road',
      distanceStr: firstStep?.distance
        ? firstStep.distance >= 1000
          ? `${(firstStep.distance / 1000).toFixed(1)} km`
          : `${Math.round(firstStep.distance)} m`
        : '500 m',
      type: banner?.type || firstStep?.maneuver?.type || 'turn',
      modifier: banner?.modifier || firstStep?.maneuver?.modifier || 'straight',
    };

    // Extract ALL upcoming steps for the full scrollable trip list
    const upcomingSteps: ManeuverInfo[] = steps.slice(1).map((step: any) => {
      const stepDist = Math.round(step.distance);
      return {
        instruction: step.bannerInstructions?.[0]?.primary?.text || step.maneuver?.instruction || 'Continue',
        roadName: step.name || 'Road',
        distanceStr: stepDist >= 1000 ? `${(stepDist / 1000).toFixed(1)} km` : `${stepDist} m`,
        type: step.maneuver?.type || 'turn',
        modifier: step.maneuver?.modifier || 'straight',
      };
    });

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
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return null;
    console.error('Failed to fetch directions:', error);
    return null;
  }
}
