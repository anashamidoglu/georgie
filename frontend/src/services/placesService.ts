export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  category?: 'home' | 'work' | 'history' | 'place' | 'fuel' | 'coffee' | 'parking' | 'grocery' | 'hospital';
  coordinates: [number, number]; // [lng, lat]
  subtitle?: string;
  distanceKm?: number;
  isHistory?: boolean;
}

export interface SavedPlace {
  id: 'home' | 'work';
  label: string;
  address: string;
  coordinates: [number, number];
}

function calculateDistance(c1: [number, number], c2: [number, number]): number {
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

export const SAVED_PLACES: SavedPlace[] = [
  {
    id: 'home',
    label: 'Home',
    address: '25.362693, 55.419909',
    coordinates: [55.419909, 25.362693],
  },
  {
    id: 'work',
    label: 'Work',
    address: '25.301654, 55.485259',
    coordinates: [55.485259, 25.301654],
  },
];

export const INITIAL_RECENTS: PlaceResult[] = [
  {
    id: 'rec-1',
    name: 'Colleges of Medical & Health Sciences E3...',
    address: 'M25, Medical College - Sharjah',
    subtitle: 'Open · Closes 4 PM',
    category: 'history',
    coordinates: [55.4855, 25.2917],
    isHistory: true,
  },
  {
    id: 'rec-2',
    name: 'City Centre Mirdif',
    address: 'Sheikh Mohammed Bin Zayed Road - Dubai',
    subtitle: 'Open · Closes 12 AM',
    category: 'history',
    coordinates: [55.4077, 25.2155],
    isHistory: true,
  },
  {
    id: 'rec-3',
    name: 'Dubai Mall',
    address: 'Downtown Dubai, Dubai',
    subtitle: 'Open · Closes 12 AM',
    category: 'history',
    coordinates: [55.2785, 25.1972],
    isHistory: true,
  },
];

// Rich Curated UAE Autocomplete Knowledge Base
const UAE_KNOWLEDGE_BASE: PlaceResult[] = [
  {
    id: 'mirdif-cc',
    name: 'Mirdif City Centre',
    address: 'Sheikh Mohammed Bin Zayed Rd, Mirdif, Dubai',
    coordinates: [55.4077, 25.2155],
    category: 'place',
  },
  {
    id: 'carrefour-mirdif',
    name: 'Carrefour | City Center Mirdif',
    address: 'City Center - Mirdif, Dubai',
    coordinates: [55.4085, 25.216],
    category: 'grocery',
  },
  {
    id: 'como-lounge',
    name: 'Como Lounge Dubai',
    address: '78th Street - Mirdif - Dubai',
    coordinates: [55.421, 25.223],
    category: 'coffee',
  },
  {
    id: 'mirdif-dubai',
    name: 'Mirdif',
    address: 'Dubai, United Arab Emirates',
    coordinates: [55.418, 25.221],
    category: 'place',
  },
  {
    id: 'mirdif-physio',
    name: 'Mirdif Center for Physiotherapy & Rehabilitation',
    address: 'Uptown Mirdif, Dubai',
    coordinates: [55.415, 25.219],
    category: 'hospital',
  },
  {
    id: 'burj-khalifa',
    name: 'Burj Khalifa',
    address: '1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai',
    coordinates: [55.2744, 25.1972],
    category: 'place',
  },
  {
    id: 'dxb-intl',
    name: 'Dubai International Airport (DXB)',
    address: 'Airport Road, Garhoud, Dubai',
    coordinates: [55.3657, 25.2532],
    category: 'place',
  },
  {
    id: 'mall-emirates',
    name: 'Mall of the Emirates',
    address: 'Sheikh Zayed Rd, Al Barsha 1, Dubai',
    coordinates: [55.2007, 25.1181],
    category: 'place',
  },
  {
    id: 'sharjah-airport',
    name: 'Sharjah International Airport (SHJ)',
    address: 'Airport Rd, Sharjah',
    coordinates: [55.5172, 25.3286],
    category: 'place',
  },
  {
    id: 'enoc-ittihad',
    name: 'ENOC Service Station 1018',
    address: 'Al Ittihad Road (E11), Sharjah',
    coordinates: [55.378, 25.312],
    category: 'fuel',
  },
  {
    id: 'adnoc-wahda',
    name: 'ADNOC Oasis Service Station',
    address: 'Al Wahda Street, Sharjah',
    coordinates: [55.395, 25.334],
    category: 'fuel',
  },
];

export async function searchPlaces(
  query: string,
  userCoords: [number, number],
  accessToken: string,
  signal?: AbortSignal
): Promise<PlaceResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // Local knowledge matching (instant prefix / substring match)
  const localMatches = UAE_KNOWLEDGE_BASE.filter(
    (p) =>
      p.name.toLowerCase().includes(trimmed) ||
      p.address.toLowerCase().includes(trimmed)
  ).map((p) => ({
    ...p,
    distanceKm: calculateDistance(userCoords, p.coordinates),
  }));

  if (!accessToken) {
    return localMatches;
  }

  try {
    const encoded = encodeURIComponent(query.trim());
    const proximity = `${userCoords[0]},${userCoords[1]}`;
    // UAE bounding box [minX, minY, maxX, maxY]
    const uaeBbox = '51.5,22.5,56.5,26.2';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?proximity=${proximity}&bbox=${uaeBbox}&country=ae&types=poi,address,neighborhood,locality,place&limit=8&fuzzyMatch=true&autocomplete=true&access_token=${accessToken}`;

    const response = await fetch(url, { signal });
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const remoteResults: PlaceResult[] = data.features.map((f: any) => {
          const coords: [number, number] = f.center || [0, 0];
          const distKm = calculateDistance(userCoords, coords);

          let cat: PlaceResult['category'] = 'place';
          const types = (f.properties?.category || '').toLowerCase();
          if (types.includes('gas') || types.includes('fuel')) cat = 'fuel';
          else if (types.includes('coffee') || types.includes('cafe')) cat = 'coffee';
          else if (types.includes('parking')) cat = 'parking';
          else if (types.includes('grocery') || types.includes('supermarket')) cat = 'grocery';
          else if (types.includes('hospital') || types.includes('medical')) cat = 'hospital';

          return {
            id: f.id,
            name: f.text || f.place_name?.split(',')[0] || 'Location',
            address: f.place_name || f.properties?.address || 'United Arab Emirates',
            category: cat,
            coordinates: coords,
            distanceKm: distKm,
            isHistory: false,
          };
        });

        // Merge local matches with remote results (removing duplicate IDs or names)
        const combined: PlaceResult[] = [...localMatches];
        remoteResults.forEach((remote) => {
          if (!combined.some((c) => c.name.toLowerCase() === remote.name.toLowerCase())) {
            combined.push(remote);
          }
        });

        return combined.slice(0, 8);
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn('Geocoding error, falling back to local matches:', err);
  }

  return localMatches;
}
