import { useState, useEffect } from 'react';

export interface PositionState {
  coords: [number, number]; // [lng, lat]
  heading: number | null;
  speed: number | null; // in m/s
  accuracy: number | null;
  isLocated: boolean;
  error: string | null;
}

// Default fallback coordinates if geolocation is completely unavailable
const DEFAULT_COORDS: [number, number] = [55.2708, 25.2048];

export function useCurrentPosition(): PositionState {
  const [position, setPosition] = useState<PositionState>({
    coords: DEFAULT_COORDS,
    heading: 0,
    speed: 0,
    accuracy: null,
    isLocated: false,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPosition((prev) => ({
        ...prev,
        error: 'Geolocation not supported',
      }));
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
    };

    let lastCoords: [number, number] | null = null;

    const handleSuccess = (pos: GeolocationPosition) => {
      const newCoords: [number, number] = [
        pos.coords.longitude,
        pos.coords.latitude,
      ];

      // Jitter filter
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
        heading: pos.coords.heading || 0,
        speed: pos.coords.speed || 0,
        accuracy: pos.coords.accuracy,
        isLocated: true,
        error: null,
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      setPosition((prev) => ({
        ...prev,
        error: err.message,
      }));
    };

    // Immediate one-time high-accuracy lookup on start
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

    // Continuous watch
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
