import { useState, useEffect } from 'react';

export interface PositionState {
  coords: [number, number]; // [lng, lat]
  heading: number | null;
  speed: number | null; // in m/s
  accuracy: number | null;
  error: string | null;
}

// Default fallback coordinates (Dubai / UAE center)
const DEFAULT_COORDS: [number, number] = [55.2708, 25.2048];

export function useCurrentPosition(): PositionState {
  const [position, setPosition] = useState<PositionState>({
    coords: DEFAULT_COORDS,
    heading: 0,
    speed: 0,
    accuracy: null,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPosition((prev) => ({
        ...prev,
        error: 'Geolocation not supported by browser',
      }));
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    };

    let lastCoords: [number, number] | null = null;

    const handleSuccess = (pos: GeolocationPosition) => {
      const newCoords: [number, number] = [
        pos.coords.longitude,
        pos.coords.latitude,
      ];

      // Stationary throttling / noise filter: only update if moved > ~0.000005 deg (~0.5m)
      if (lastCoords) {
        const deltaLng = Math.abs(newCoords[0] - lastCoords[0]);
        const deltaLat = Math.abs(newCoords[1] - lastCoords[1]);
        if (deltaLng < 0.000005 && deltaLat < 0.000005) {
          return;
        }
      }

      lastCoords = newCoords;

      setPosition({
        coords: newCoords,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
        error: null,
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      // In dev desktop mode, keep default coordinates without breaking UI
      setPosition((prev) => ({
        ...prev,
        error: err.message,
      }));
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return position;
}
