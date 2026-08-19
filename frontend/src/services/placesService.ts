export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  category?: 'home' | 'uni' | 'history' | 'place' | 'fuel' | 'coffee' | 'parking' | 'grocery' | 'hospital' | 'mall' | 'landmark';
  coordinates: [number, number]; // [lng, lat]
  subtitle?: string;
  distanceKm?: number;
  isHistory?: boolean;
}

export interface SavedPlace {
  id: 'home' | 'uni';
  label: string;
  address: string;
  coordinates: [number, number];
}

const GOOGLE_PLACES_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

// Hard Daily Budget Safety Limit (Maximum 100 remote Google API calls per day to guarantee $0.00 bill)
const DAILY_MAX_GOOGLE_REQUESTS = 100;
const CACHE_PREFIX = 'georgie_places_v1_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cache

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

// In-Memory Fast Cache
const memoryCache = new Map<string, { data: PlaceResult[]; timestamp: number }>();

function getCachedResults(key: string): PlaceResult[] | null {
  const normalizedKey = key.trim().toLowerCase();

  // 1. Check RAM cache
  const inMem = memoryCache.get(normalizedKey);
  if (inMem && Date.now() - inMem.timestamp < CACHE_TTL_MS) {
    return inMem.data;
  }

  // 2. Check localStorage
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

// Daily Circuit Breaker: Track daily request count
function checkAndIncrementDailyQuota(): boolean {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `georgie_google_calls_${today}`;
    const currentCount = parseInt(localStorage.getItem(key) || '0', 10);

    if (currentCount >= DAILY_MAX_GOOGLE_REQUESTS) {
      console.warn(`[SAFETY] Daily Google Places API quota reached (${DAILY_MAX_GOOGLE_REQUESTS} calls). Using local knowledge base to prevent any billing.`);
      return false;
    }

    localStorage.setItem(key, (currentCount + 1).toString());
    return true;
  } catch {
    return true;
  }
}

export const SAVED_PLACES: SavedPlace[] = [
  {
    id: 'home',
    label: 'Home',
    address: '25.362693, 55.419909',
    coordinates: [55.419909, 25.362693],
  },
  {
    id: 'uni',
    label: 'Uni',
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

// Curated UAE Knowledge Base
const UAE_KNOWLEDGE_BASE: PlaceResult[] = [
  // Malls & Shopping
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

  // Universities & Education
  { id: 'uos-med', name: 'University of Sharjah - Medical Campus', address: 'University City, Sharjah', coordinates: [55.4855, 25.2917], category: 'uni' },
  { id: 'uos-main', name: 'University of Sharjah (Main Campus)', address: 'University City, Sharjah', coordinates: [55.4744, 25.2862], category: 'uni' },
  { id: 'aus', name: 'American University of Sharjah (AUS)', address: 'University City, Sharjah', coordinates: [55.4912, 25.3111], category: 'uni' },
  { id: 'hct-sharjah-men', name: 'Higher Colleges of Technology (Sharjah Men)', address: 'University City, Sharjah', coordinates: [55.4678, 25.3056], category: 'uni' },
  { id: 'hct-sharjah-women', name: 'Higher Colleges of Technology (Sharjah Women)', address: 'University City, Sharjah', coordinates: [55.4712, 25.3012], category: 'uni' },
  { id: 'skyline-uni', name: 'Skyline University College', address: 'University City, Sharjah', coordinates: [55.4801, 25.2954], category: 'uni' },

  // Hospitals & Healthcare
  { id: 'uhs', name: 'University Hospital Sharjah', address: 'University City Rd, Sharjah', coordinates: [55.4822, 25.2891], category: 'hospital' },
  { id: 'zulekha-shj', name: 'Zulekha Hospital Sharjah', address: 'Al Nasserya, Sharjah', coordinates: [55.4089, 25.3612], category: 'hospital' },
  { id: 'qassimi-hosp', name: 'Al Qassimi Hospital', address: 'Wasit St, Al Khezamia, Sharjah', coordinates: [55.4215, 25.3488], category: 'hospital' },
  { id: 'medcare-mirdif', name: 'Medcare Medical Centre Mirdif', address: 'Uptown Mirdif, Dubai', coordinates: [55.4162, 25.2205], category: 'hospital' },
  { id: 'aster-al-nahda', name: 'Aster Hospital Al Nahda', address: 'Al Nahda 1, Dubai', coordinates: [55.3678, 25.2891], category: 'hospital' },

  // Fuel Stations
  { id: 'enoc-ittihad-1018', name: 'ENOC Service Station 1018', address: 'Al Ittihad Road (E11), Sharjah', coordinates: [55.378, 25.312], category: 'fuel' },
  { id: 'enoc-mirdif-311', name: 'ENOC Service Station - E311 Mirdif', address: 'Sheikh Mohammed Bin Zayed Rd, Mirdif', coordinates: [55.4095, 25.218], category: 'fuel' },
  { id: 'adnoc-wahda', name: 'ADNOC Oasis Service Station', address: 'Al Wahda Street, Sharjah', coordinates: [55.395, 25.334], category: 'fuel' },
  { id: 'adnoc-university', name: 'ADNOC Service Station - University City', address: 'University City Rd, Sharjah', coordinates: [55.4612, 25.3155], category: 'fuel' },
  { id: 'emarat-airport-rd', name: 'Emarat Petrol Station - Airport Rd', address: 'Airport Road (D89), Garhoud, Dubai', coordinates: [55.3588, 25.2492], category: 'fuel' },

  // Cafes & Dining
  { id: 'starbucks-mcc', name: 'Starbucks Coffee - City Centre Mirdif', address: 'City Centre Mirdif Ground Floor, Dubai', coordinates: [55.4082, 25.216], category: 'coffee' },
  { id: 'starbucks-zahia', name: 'Starbucks - City Centre Al Zahia', address: 'City Centre Al Zahia, Sharjah', coordinates: [55.4525, 25.3216], category: 'coffee' },
  { id: 'arabica-dubai-mall', name: '% Arabica - The Dubai Mall', address: 'Fashion Avenue, The Dubai Mall', coordinates: [55.2792, 25.1985], category: 'coffee' },
  { id: 'tim-hortons-mirdif', name: 'Tim Hortons - Uptown Mirdif', address: 'Uptown Mirdif Mall, Dubai', coordinates: [55.4155, 25.2198], category: 'coffee' },
  { id: 'costa-airport-rd', name: 'Costa Coffee - Airport Road', address: 'Garhoud, Dubai', coordinates: [55.3611, 25.2512], category: 'coffee' },

  // Landmarks & Airports
  { id: 'dxb-airport', name: 'Dubai International Airport (DXB)', address: 'Airport Road, Garhoud, Dubai', coordinates: [55.3657, 25.2532], category: 'landmark' },
  { id: 'shj-airport', name: 'Sharjah International Airport (SHJ)', address: 'Airport Rd, Sharjah', coordinates: [55.5172, 25.3286], category: 'landmark' },
  { id: 'burj-khalifa', name: 'Burj Khalifa', address: '1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai', coordinates: [55.2744, 25.1972], category: 'landmark' },
  { id: 'museum-future', name: 'Museum of the Future', address: 'Sheikh Zayed Rd, Trade Centre 2, Dubai', coordinates: [55.2818, 25.2192], category: 'landmark' },
  { id: 'dubai-frame', name: 'Dubai Frame', address: 'Zabeel Park Gate 4, Dubai', coordinates: [55.3003, 25.2345], category: 'landmark' },
  { id: 'sharjah-mosque', name: 'Sharjah Mosque', address: 'Maliha Rd & Emirates Rd (E611), Sharjah', coordinates: [55.5997, 25.2783], category: 'landmark' },
  { id: 'al-majaz', name: 'Al Majaz Waterfront', address: 'Corniche St, Al Majaz 2, Sharjah', coordinates: [55.3854, 25.3315], category: 'landmark' },
];

export async function searchPlaces(
  query: string,
  userCoords: [number, number],
  accessToken: string,
  signal?: AbortSignal
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Safeguard 1: Instant RAM & LocalStorage Cache (0 requests, $0.00 cost)
  const cached = getCachedResults(trimmed);
  if (cached && cached.length > 0) {
    console.log(
      `%c[Places Cache Hit] ⚡ "${trimmed}" served from 7-day storage (0 network requests, $0.00 cost)`,
      'color: #10b981; font-weight: bold; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px;'
    );
    return cached.map((p) => ({
      ...p,
      distanceKm: calculateDistance(userCoords, p.coordinates),
    }));
  }

  // Safeguard 2: Require at least 3 characters before hitting any remote API
  if (trimmed.length < 3) {
    const lower = trimmed.toLowerCase();
    return UAE_KNOWLEDGE_BASE.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.address.toLowerCase().includes(lower)
    ).map((p) => ({
      ...p,
      distanceKm: calculateDistance(userCoords, p.coordinates),
    }));
  }

  // 1. High-Precision Google Places API (New) with Hard Quota Safety Check
  if (GOOGLE_PLACES_KEY && checkAndIncrementDailyQuota()) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyCount = localStorage.getItem(`georgie_google_calls_${today}`) || '1';
      console.log(
        `%c[Google Places API] 🌐 Live Request #${dailyCount}/100: "${trimmed}"`,
        'color: #0ea5e9; font-weight: bold; background: rgba(14,165,233,0.1); padding: 2px 6px; border-radius: 4px;'
      );

      const url = 'https://places.googleapis.com/v1/places:searchText';
      const payload = {
        textQuery: trimmed,
        locationBias: {
          circle: {
            center: { latitude: userCoords[1], longitude: userCoords[0] },
            radius: 50000.0, // 50km radius bias around car
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const results: PlaceResult[] = data.places.map((p: any) => {
            const lat = p.location?.latitude || 0;
            const lng = p.location?.longitude || 0;
            const coords: [number, number] = [lng, lat];
            const distKm = calculateDistance(userCoords, coords);

            return {
              id: p.id || `goog-${lat}-${lng}`,
              name: p.displayName?.text || 'Location',
              address: p.formattedAddress || 'United Arab Emirates',
              category: 'place',
              coordinates: coords,
              distanceKm: distKm,
              isHistory: false,
            };
          });

          // Sort by distance ascending so closest places appear first
          results.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));

          // Save to 7-day cache so future identical searches cost $0.00
          setCachedResults(trimmed, results);
          return results;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Google Places API query failed, falling back to Mapbox/local:', err);
    }
  }

  // 2. Fallback: Local curated knowledge base
  const lowerTrimmed = trimmed.toLowerCase();
  const localMatches = UAE_KNOWLEDGE_BASE.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(lowerTrimmed);
    const addrMatch = p.address.toLowerCase().includes(lowerTrimmed);
    return nameMatch || addrMatch;
  }).map((p) => ({
    ...p,
    distanceKm: calculateDistance(userCoords, p.coordinates),
  }));

  if (!accessToken) {
    localMatches.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    return localMatches;
  }

  // 3. Secondary Fallback: Mapbox Forward Geocoding
  try {
    const encoded = encodeURIComponent(trimmed);
    const proximity = `${userCoords[0]},${userCoords[1]}`;
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
          else if (types.includes('mall') || types.includes('shop')) cat = 'mall';

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
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  localMatches.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  return localMatches;
}
