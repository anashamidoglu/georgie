export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  category?: 'home' | 'uni' | 'work' | 'favorite' | 'history' | 'place' | 'fuel' | 'coffee' | 'parking' | 'grocery' | 'hospital' | 'mall' | 'landmark';
  coordinates: [number, number]; // [lng, lat]
  subtitle?: string;
  distanceKm?: number;
  isHistory?: boolean;
  isSaved?: boolean;
  icon?: string;
  created_at?: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  category?: 'home' | 'uni' | 'work' | 'favorite' | 'gym' | 'coffee' | 'custom';
  icon?: string;
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const CACHE_PREFIX = 'georgie_places_v2_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cache

export function calculateDistance(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const rad = Math.PI / 180;
  const dLat = (c2[1] - c1[1]) * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1[1] * rad) * Math.cos(c2[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// In-Memory Fast Cache
const memoryCache = new Map<string, { data: PlaceResult[]; timestamp: number }>();

function getCachedResults(key: string): PlaceResult[] | null {
  const normalizedKey = key.trim().toLowerCase();

  const inMem = memoryCache.get(normalizedKey);
  if (inMem && Date.now() - inMem.timestamp < CACHE_TTL_MS) {
    return inMem.data;
  }

  try {
    const itemStr = localStorage.getItem(`${CACHE_PREFIX}${normalizedKey}`);
    if (itemStr) {
      const parsed = JSON.parse(itemStr);
      if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryCache.set(normalizedKey, parsed);
        return parsed.data;
      }
    }
  } catch {}

  return null;
}

function setCachedResults(key: string, data: PlaceResult[]) {
  const normalizedKey = key.trim().toLowerCase();
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(normalizedKey, entry);

  try {
    localStorage.setItem(`${CACHE_PREFIX}${normalizedKey}`, JSON.stringify(entry));
  } catch {}
}

// ==============================================================================
// SQLite Persistent Saved & Recent Places API Methods
// ==============================================================================

export const DEFAULT_SAVED_PLACES: SavedPlace[] = [
  {
    id: 'home',
    name: 'Home',
    address: 'Al Jazzat, Sharjah',
    coordinates: [55.419909, 25.362693],
    category: 'home',
    icon: 'home',
  },
  {
    id: 'uni',
    name: 'Uni',
    address: 'American University of Sharjah',
    coordinates: [55.491400, 25.311700],
    category: 'uni',
    icon: 'graduation-cap',
  },
];

export async function fetchSavedPlaces(): Promise<SavedPlace[]> {
  try {
    const res = await fetch('/api/nav/places/saved');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('georgie_saved_places', JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend saved places fetch failed, using local cache:', e);
  }

  try {
    const local = localStorage.getItem('georgie_saved_places');
    if (local) return JSON.parse(local);
  } catch {}

  return DEFAULT_SAVED_PLACES;
}

export async function savePlaceToDb(place: {
  id?: string;
  name: string;
  address?: string;
  coordinates: [number, number];
  category?: string;
  icon?: string;
}): Promise<void> {
  const payload = {
    id: place.id,
    name: place.name,
    address: place.address || '',
    lat: place.coordinates[1],
    lng: place.coordinates[0],
    category: place.category || 'favorite',
    icon: place.icon || 'star',
  };

  try {
    await fetch('/api/nav/places/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Failed to sync saved place to backend:', e);
  }

  try {
    const current = await fetchSavedPlaces();
    const existingIndex = current.findIndex((p) => p.name.toLowerCase() === place.name.toLowerCase());
    const newPlace: SavedPlace = {
      id: place.id || `fav-${Date.now()}`,
      name: place.name,
      address: place.address || '',
      coordinates: place.coordinates,
      category: (place.category as any) || 'favorite',
      icon: place.icon || 'star',
    };

    let updated: SavedPlace[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = newPlace;
    } else {
      updated = [...current, newPlace];
    }
    localStorage.setItem('georgie_saved_places', JSON.stringify(updated));
  } catch {}
}

export async function deleteSavedPlaceFromDb(placeId: string): Promise<void> {
  try {
    await fetch(`/api/nav/places/saved/${placeId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Failed to delete saved place from backend:', e);
  }

  try {
    const current = await fetchSavedPlaces();
    const filtered = current.filter((p) => p.id !== placeId);
    localStorage.setItem('georgie_saved_places', JSON.stringify(filtered));
  } catch {}
}

export async function fetchRecentPlaces(): Promise<PlaceResult[]> {
  try {
    const res = await fetch('/api/nav/places/recent');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem('georgie_recent_places', JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend recent places fetch failed, using local cache:', e);
  }

  try {
    const local = localStorage.getItem('georgie_recent_places');
    if (local) return JSON.parse(local);
  } catch {}

  return [
    {
      id: 'rec-1',
      name: 'The Dubai Mall',
      address: 'Financial Center Rd, Downtown Dubai',
      coordinates: [55.2744, 25.1972],
      category: 'history',
      isHistory: true,
    },
    {
      id: 'rec-2',
      name: 'Sharjah Airport (SHJ)',
      address: 'Airport Road, Sharjah',
      coordinates: [55.5172, 25.3286],
      category: 'history',
      isHistory: true,
    },
  ];
}

export async function recordRecentPlaceToDb(place: {
  name: string;
  address?: string;
  coordinates: [number, number];
}): Promise<void> {
  const payload = {
    name: place.name,
    address: place.address || '',
    lat: place.coordinates[1],
    lng: place.coordinates[0],
  };

  try {
    await fetch('/api/nav/places/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Failed to record recent place to backend:', e);
  }

  try {
    const current = await fetchRecentPlaces();
    const filtered = current.filter((p) => p.name.toLowerCase() !== place.name.toLowerCase());
    const updated: PlaceResult[] = [
      {
        id: `rec-${Date.now()}`,
        name: place.name,
        address: place.address || '',
        coordinates: place.coordinates,
        category: 'history',
        isHistory: true,
      },
      ...filtered.slice(0, 9),
    ];
    localStorage.setItem('georgie_recent_places', JSON.stringify(updated));
  } catch {}
}

export async function deleteRecentPlaceFromDb(placeId: string): Promise<void> {
  try {
    await fetch(`/api/nav/places/recent/${placeId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Failed to delete recent place from backend:', e);
  }

  try {
    const current = await fetchRecentPlaces();
    const filtered = current.filter((p) => p.id !== placeId);
    localStorage.setItem('georgie_recent_places', JSON.stringify(filtered));
  } catch {}
}

// Curated UAE Knowledge Base
const UAE_KNOWLEDGE_BASE: PlaceResult[] = [
  { id: 'mcc', name: 'Mirdif City Centre', address: 'Sheikh Mohammed Bin Zayed Rd, Mirdif, Dubai', coordinates: [55.4077, 25.2155], category: 'mall' },
  { id: 'city-centre-mirdif', name: 'City Centre Mirdif', address: 'Sheikh Mohammed Bin Zayed Rd - Mirdif - Dubai', coordinates: [55.4077, 25.2155], category: 'mall' },
  { id: 'carrefour-mirdif', name: 'Carrefour | City Center Mirdif', address: 'City Center - Mirdif, Dubai', coordinates: [55.4085, 25.216], category: 'grocery' },
  { id: 'como-lounge', name: 'Como Lounge Dubai', address: '78th Street - Mirdif - Dubai', coordinates: [55.421, 25.223], category: 'coffee' },
  { id: 'mirdif-area', name: 'Mirdif', address: 'Dubai, United Arab Emirates', coordinates: [55.418, 25.221], category: 'place' },
  { id: 'mirdif-physio', name: 'Mirdif Center for Physiotherapy & Rehabilitation', address: 'Uptown Mirdif, Dubai', coordinates: [55.415, 25.219], category: 'hospital' },
  { id: 'dubai-mall', name: 'The Dubai Mall', address: 'Financial Center Rd, Downtown Dubai', coordinates: [55.2785, 25.1972], category: 'mall' },
  { id: 'moe', name: 'Mall of the Emirates', address: 'Sheikh Zayed Rd, Al Barsha 1, Dubai', coordinates: [55.2007, 25.1181], category: 'mall' },
  { id: 'city-centre-al-zahia', name: 'City Centre Al Zahia', address: 'University City Rd, Industrial Area, Sharjah', coordinates: [55.4522, 25.3214], category: 'mall' },
  { id: 'sahara-centre', name: 'Sahara Centre', address: 'Al Nahda, Sharjah', coordinates: [55.3725, 25.2977], category: 'mall' },
  { id: 'mega-mall', name: 'Mega Mall Sharjah', address: 'Near Cultural Square, Bu Daniq, Sharjah', coordinates: [55.4001, 25.3438], category: 'mall' },
  { id: 'city-centre-sharjah', name: 'City Centre Sharjah', address: 'Al Wahda St, Industrial Area 1, Sharjah', coordinates: [55.3912, 25.3275], category: 'mall' },
  { id: 'city-centre-deira', name: 'City Centre Deira', address: '8th St, Port Saeed, Dubai', coordinates: [55.3331, 25.2514], category: 'mall' },
  { id: 'dubai-hills-mall', name: 'Dubai Hills Mall', address: 'Dubai Hills Estate, Dubai', coordinates: [55.2427, 25.1018], category: 'mall' },
  { id: 'dubai-festival-city', name: 'Dubai Festival City Mall', address: 'Crescent Rd, Dubai Festival City', coordinates: [55.3526, 25.2224], category: 'mall' },
  { id: 'ibn-battuta', name: 'Ibn Battuta Mall', address: 'Sheikh Zayed Rd, Jebel Ali Village, Dubai', coordinates: [55.1206, 25.0442], category: 'mall' },
  { id: 'uos-med', name: 'University of Sharjah - Medical Campus', address: 'University City, Sharjah', coordinates: [55.4855, 25.2917], category: 'uni' },
  { id: 'uos-main', name: 'University of Sharjah (Main Campus)', address: 'University City, Sharjah', coordinates: [55.4744, 25.2862], category: 'uni' },
  { id: 'aus', name: 'American University of Sharjah (AUS)', address: 'University City, Sharjah', coordinates: [55.4912, 25.3111], category: 'uni' },
  { id: 'hct-sharjah-men', name: 'Higher Colleges of Technology (Sharjah Men)', address: 'University City, Sharjah', coordinates: [55.4678, 25.3056], category: 'uni' },
  { id: 'hct-sharjah-women', name: 'Higher Colleges of Technology (Sharjah Women)', address: 'University City, Sharjah', coordinates: [55.4712, 25.3012], category: 'uni' },
  { id: 'skyline-uni', name: 'Skyline University College', address: 'University City, Sharjah', coordinates: [55.4801, 25.2954], category: 'uni' },
  { id: 'uhs', name: 'University Hospital Sharjah', address: 'University City Rd, Sharjah', coordinates: [55.4822, 25.2891], category: 'hospital' },
  { id: 'zulekha-shj', name: 'Zulekha Hospital Sharjah', address: 'Al Nasserya, Sharjah', coordinates: [55.4089, 25.3612], category: 'hospital' },
  { id: 'qassimi-hosp', name: 'Al Qassimi Hospital', address: 'Wasit St, Al Khezamia, Sharjah', coordinates: [55.4215, 25.3488], category: 'hospital' },
  { id: 'medcare-mirdif', name: 'Medcare Medical Centre Mirdif', address: 'Uptown Mirdif, Dubai', coordinates: [55.4162, 25.2205], category: 'hospital' },
  { id: 'aster-al-nahda', name: 'Aster Hospital Al Nahda', address: 'Al Nahda 1, Dubai', coordinates: [55.3678, 25.2891], category: 'hospital' },
  { id: 'enoc-ittihad-1018', name: 'ENOC Service Station 1018', address: 'Al Ittihad Road (E11), Sharjah', coordinates: [55.378, 25.312], category: 'fuel' },
  { id: 'enoc-mirdif-311', name: 'ENOC Service Station - E311 Mirdif', address: 'Sheikh Mohammed Bin Zayed Rd, Mirdif', coordinates: [55.4095, 25.218], category: 'fuel' },
  { id: 'adnoc-wahda', name: 'ADNOC Oasis Service Station', address: 'Al Wahda Street, Sharjah', coordinates: [55.395, 25.334], category: 'fuel' },
  { id: 'adnoc-university', name: 'ADNOC Service Station - University City', address: 'University City Rd, Sharjah', coordinates: [55.4612, 25.3155], category: 'fuel' },
  { id: 'emarat-airport-rd', name: 'Emarat Petrol Station - Airport Rd', address: 'Airport Road (D89), Garhoud, Dubai', coordinates: [55.3588, 25.2492], category: 'fuel' },
];

function isInsideUae(coords: [number, number]): boolean {
  const [lng, lat] = coords;
  return lng >= 51.0 && lng <= 57.0 && lat >= 22.0 && lat <= 26.8;
}

export async function searchPlaces(
  query: string,
  userCoords: [number, number] = [55.419909, 25.362693],
  accessToken?: string,
  signal?: AbortSignal
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. Check Fast Cache
  const cached = getCachedResults(trimmed);
  if (cached && cached.length > 0) {
    return cached.map((p) => ({
      ...p,
      distanceKm: calculateDistance(userCoords, p.coordinates),
    }));
  }

  // 2. Local UAE Knowledge Base Fast Match
  const lowerTrimmed = trimmed.toLowerCase();
  const localMatches = UAE_KNOWLEDGE_BASE.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(lowerTrimmed);
    const addrMatch = p.address.toLowerCase().includes(lowerTrimmed);
    return nameMatch || addrMatch;
  }).map((p) => ({
    ...p,
    distanceKm: calculateDistance(userCoords, p.coordinates),
  }));

  // 3. Primary: Google Places API (New) via local Vite dev proxy & backend
  const effectiveGoogleKey = GOOGLE_API_KEY;
  if (effectiveGoogleKey) {
    try {
      const gUrl = '/google-places/v1/places:searchText';
      const gResp = await fetch(gUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': effectiveGoogleKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType',
        },
        body: JSON.stringify({
          textQuery: trimmed,
          regionCode: 'AE',
          locationBias: {
            circle: {
              center: { latitude: userCoords[1] || 25.2048, longitude: userCoords[0] || 55.2708 },
              radius: 50000.0,
            },
          },
          maxResultCount: 10,
        }),
        signal,
      });

      if (gResp.ok) {
        const gData = await gResp.json();
        const rawPlaces = gData.places || [];
        if (Array.isArray(rawPlaces) && rawPlaces.length > 0) {
          const googleResults: PlaceResult[] = rawPlaces
            .filter((p: any) => p.location?.latitude !== undefined && p.location?.longitude !== undefined)
            .map((p: any) => {
              const coords: [number, number] = [p.location.longitude, p.location.latitude];
              const types = p.types || [];
              const primaryType = (p.primaryType || '').toLowerCase();
              const allTypesStr = types.join(' ').toLowerCase() + ' ' + primaryType;

              let cat: PlaceResult['category'] = 'place';
              if (allTypesStr.includes('gas_station') || allTypesStr.includes('fuel')) cat = 'fuel';
              else if (allTypesStr.includes('cafe') || allTypesStr.includes('coffee')) cat = 'coffee';
              else if (allTypesStr.includes('mall') || allTypesStr.includes('shopping')) cat = 'mall';
              else if (allTypesStr.includes('hospital') || allTypesStr.includes('medical') || allTypesStr.includes('health')) cat = 'hospital';
              else if (allTypesStr.includes('supermarket') || allTypesStr.includes('grocery')) cat = 'grocery';
              else if (allTypesStr.includes('university') || allTypesStr.includes('school')) cat = 'uni';
              else if (allTypesStr.includes('parking')) cat = 'parking';

              return {
                id: p.id || `g-${coords[0]}-${coords[1]}`,
                name: p.displayName?.text || 'Location',
                address: p.formattedAddress || 'United Arab Emirates',
                category: cat,
                coordinates: coords,
                distanceKm: calculateDistance(userCoords, coords),
                isHistory: false,
              };
            })
            .filter((p: PlaceResult) => isInsideUae(p.coordinates));

          if (googleResults.length > 0) {
            const combined: PlaceResult[] = [...localMatches];
            googleResults.forEach((gr) => {
              if (!combined.some((c) => c.name.toLowerCase() === gr.name.toLowerCase())) {
                combined.push(gr);
              }
            });

            combined.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
            setCachedResults(trimmed, combined.slice(0, 10));
            return combined.slice(0, 10);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Google Places Vite proxy error, trying backend endpoint:', err);
    }
  }

  // 4. Secondary: Backend Places Proxy (/api/nav/places/search)
  try {
    const searchUrl = `/api/nav/places/search?query=${encodeURIComponent(trimmed)}&lat=${userCoords[1]}&lng=${userCoords[0]}`;
    const res = await fetch(searchUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      const rawPlaces = data.places || [];
      if (Array.isArray(rawPlaces) && rawPlaces.length > 0) {
        const placesWithDistance: PlaceResult[] = rawPlaces
          .map((p: any) => {
            const coords: [number, number] = p.coordinates || [0, 0];
            return {
              id: p.id || `plc-${coords[0]}-${coords[1]}`,
              name: p.name || 'Location',
              address: p.address || 'United Arab Emirates',
              category: p.category || 'place',
              coordinates: coords,
              distanceKm: calculateDistance(userCoords, coords),
              isHistory: false,
            };
          })
          .filter((p: PlaceResult) => isInsideUae(p.coordinates));

        if (placesWithDistance.length > 0) {
          const combined: PlaceResult[] = [...localMatches];
          placesWithDistance.forEach((remote) => {
            if (!combined.some((c) => c.name.toLowerCase() === remote.name.toLowerCase())) {
              combined.push(remote);
            }
          });

          combined.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
          setCachedResults(trimmed, combined.slice(0, 10));
          return combined.slice(0, 10);
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 5. Mapbox Forward Geocoding Fallback (strictly UAE country=ae)
  const effectiveMapboxToken = accessToken || MAPBOX_TOKEN;
  if (effectiveMapboxToken) {
    try {
      const encoded = encodeURIComponent(trimmed);
      const proximity = `${userCoords[0]},${userCoords[1]}`;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?proximity=${proximity}&country=ae&limit=8&fuzzyMatch=true&autocomplete=true&access_token=${effectiveMapboxToken}`;

      const response = await fetch(url, { signal });
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const remoteResults: PlaceResult[] = data.features
            .map((f: any) => {
              const coords: [number, number] = f.center || [0, 0];
              return {
                id: f.id,
                name: f.text || f.place_name?.split(',')[0] || 'Location',
                address: f.place_name || f.properties?.address || 'United Arab Emirates',
                category: 'place' as const,
                coordinates: coords,
                distanceKm: calculateDistance(userCoords, coords),
                isHistory: false,
              };
            })
            .filter((p: PlaceResult) => isInsideUae(p.coordinates));

          if (remoteResults.length > 0) {
            const combined: PlaceResult[] = [...localMatches];
            remoteResults.forEach((remote) => {
              if (!combined.some((c) => c.name.toLowerCase() === remote.name.toLowerCase())) {
                combined.push(remote);
              }
            });

            combined.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
            setCachedResults(trimmed, combined.slice(0, 8));
            return combined.slice(0, 8);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }
  }

  localMatches.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  return localMatches;
}
