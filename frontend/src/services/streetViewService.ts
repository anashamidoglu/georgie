// Street View Helper Service: Google Maps JS API Dynamic Loader & Heading Bearing Calculation

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMapsScript(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.StreetViewPanorama) {
    return Promise.resolve((window as any).google.maps);
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_API_KEY) {
      reject(new Error('Google API key is missing in VITE_GOOGLE_PLACES_API_KEY'));
      return;
    }

    const existingScript = document.getElementById('google-maps-js');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('google.maps failed to initialize'));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Calculates forward azimuth compass heading (0-360 deg) from coordinate 1 to coordinate 2
 */
export function calculateHeading(
  fromCoords: [number, number],
  toCoords: [number, number]
): number {
  if (!fromCoords || !toCoords) return 0;
  const [lon1, lat1] = fromCoords;
  const [lon2, lat2] = toCoords;

  const rad = Math.PI / 180;
  const dLon = (lon2 - lon1) * rad;
  const lat1Rad = lat1 * rad;
  const lat2Rad = lat2 * rad;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}
