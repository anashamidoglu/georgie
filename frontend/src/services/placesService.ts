export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  category: 'fuel' | 'coffee' | 'parking' | 'grocery' | 'hospital' | 'general';
  coordinates: [number, number]; // [lng, lat]
  distanceKm?: number;
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

// Curated UAE Quick Category Presets
export const CATEGORIES = [
  { id: 'fuel', label: 'Fuel', icon: '⛽', query: 'gas station petrol fuel ADNOC ENOC Emarat' },
  { id: 'coffee', label: 'Coffee', icon: '☕', query: 'coffee cafe Starbucks Costa Tim Hortons' },
  { id: 'parking', label: 'Parking', icon: '🅿️', query: 'parking lot garage' },
  { id: 'grocery', label: 'Grocery', icon: '🛒', query: 'supermarket Carrefour Lulu Spinneys' },
  { id: 'hospital', label: 'Hospital', icon: '🏥', query: 'hospital clinic medical emergency' },
] as const;

// Fallback curated POIs for offline or instant response
const POPULAR_UAE_POIS: PlaceResult[] = [
  {
    id: 'mcc',
    name: 'City Centre Mirdif',
    address: 'Sheikh Mohammed Bin Zayed Rd, Mirdif, Dubai',
    category: 'general',
    coordinates: [55.4077, 25.2155],
  },
  {
    id: 'dubai-mall',
    name: 'The Dubai Mall',
    address: 'Financial Center Rd, Downtown Dubai, Dubai',
    category: 'general',
    coordinates: [55.2785, 25.1972],
  },
  {
    id: 'uos-med',
    name: 'University of Sharjah - Medical Campus',
    address: 'University City, Sharjah',
    category: 'hospital',
    coordinates: [55.4855, 25.2917],
  },
  {
    id: 'enoc-ittihad',
    name: 'ENOC Service Station 1018',
    address: 'Al Ittihad Road (E11), Sharjah',
    category: 'fuel',
    coordinates: [55.378, 25.312],
  },
  {
    id: 'adnoc-sharjah',
    name: 'ADNOC Oasis Service Station',
    address: 'Al Wahda Street, Sharjah',
    category: 'fuel',
    coordinates: [55.395, 25.334],
  },
  {
    id: 'starbucks-mirdif',
    name: 'Starbucks Coffee - City Centre Mirdif',
    address: 'City Centre Mirdif Ground Floor, Dubai',
    category: 'coffee',
    coordinates: [55.4082, 25.216],
  },
  {
    id: 'dxb-airport',
    name: 'Dubai International Airport (DXB)',
    address: 'Airport Road, Garhoud, Dubai',
    category: 'general',
    coordinates: [55.3657, 25.2532],
  },
  {
    id: 'moe',
    name: 'Mall of the Emirates',
    address: 'Sheikh Zayed Road, Al Barsha 1, Dubai',
    category: 'general',
    coordinates: [55.2007, 25.1181],
  },
];

export async function searchPlaces(
  query: string,
  userCoords: [number, number],
  accessToken: string,
  signal?: AbortSignal
): Promise<PlaceResult[]> {
  if (!query.trim()) return [];

  if (!accessToken) {
    // Offline / fallback filter
    const q = query.toLowerCase();
    return POPULAR_UAE_POIS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    ).map((p) => ({
      ...p,
      distanceKm: calculateDistance(userCoords, p.coordinates),
    }));
  }

  try {
    const encoded = encodeURIComponent(query.trim());
    const proximity = `${userCoords[0]},${userCoords[1]}`;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?proximity=${proximity}&country=ae&types=poi,address,neighborhood,place&limit=8&access_token=${accessToken}`;

    const response = await fetch(url, { signal });
    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features.map((f: any) => {
          const coords: [number, number] = f.center || [0, 0];
          const distKm = calculateDistance(userCoords, coords);

          let category: PlaceResult['category'] = 'general';
          const types = f.properties?.category?.toLowerCase() || '';
          if (types.includes('gas') || types.includes('fuel')) category = 'fuel';
          else if (types.includes('coffee') || types.includes('cafe')) category = 'coffee';
          else if (types.includes('parking')) category = 'parking';
          else if (types.includes('grocery') || types.includes('supermarket')) category = 'grocery';
          else if (types.includes('hospital') || types.includes('medical')) category = 'hospital';

          return {
            id: f.id,
            name: f.text || f.place_name?.split(',')[0] || 'Location',
            address: f.place_name || f.properties?.address || 'United Arab Emirates',
            category,
            coordinates: coords,
            distanceKm: distKm,
          };
        });
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn('Places search error:', err);
  }

  // Fallback if API returns empty
  const q = query.toLowerCase();
  return POPULAR_UAE_POIS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  ).map((p) => ({
    ...p,
    distanceKm: calculateDistance(userCoords, p.coordinates),
  }));
}
