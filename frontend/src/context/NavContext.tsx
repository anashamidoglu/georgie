import React, { createContext, useContext, useState, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { fetchDirections } from '../services/navService';
import type { RouteResult, ManeuverInfo } from '../services/navService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface EtaInfo {
  arrival: string;
  duration: string;
  distance: string;
}

interface NavContextType {
  isNavExpanded: boolean;
  setIsNavExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  hasActiveRoute: boolean;
  setHasActiveRoute: (val: boolean | ((prev: boolean) => boolean)) => void;
  coords: [number, number];
  destination: [number, number] | null;
  setDestination: (dest: [number, number] | null) => void;
  heading: number | null;
  speed: number | null;
  mapInstance: MapboxMap | null;
  setMapInstance: (map: MapboxMap | null) => void;
  eta: EtaInfo;
  primaryManeuver: ManeuverInfo | null;
  upcomingSteps: ManeuverInfo[];
  activeRoute: RouteResult | null;
  calculateRouteTo: (dest: [number, number]) => Promise<void>;
  clearRoute: () => void;
  recenterMap: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

// Initial destination set to null so it doesn't jump to a random destination on start
export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  const [hasActiveRoute, setHasActiveRoute] = useState<boolean>(false);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [eta, setEta] = useState<EtaInfo>({
    arrival: '--:--',
    duration: '-- min',
    distance: '-- km',
  });

  const [primaryManeuver, setPrimaryManeuver] = useState<ManeuverInfo | null>(null);
  const [upcomingSteps, setUpcomingSteps] = useState<ManeuverInfo[]>([]);

  const position = useCurrentPosition();

  // Instant calculation to target destination
  const calculateRouteTo = async (destCoords: [number, number]) => {
    // 1. Immediately update destination state so destination pin appears with 0ms lag
    setDestination(destCoords);
    setHasActiveRoute(true);

    if (!MAPBOX_TOKEN) return;

    // 2. Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 3. Immediately fetch route
    const result = await fetchDirections(position.coords, destCoords, MAPBOX_TOKEN, controller.signal);
    if (result) {
      setActiveRoute(result);
      setEta({
        arrival: result.arrivalStr,
        duration: result.durationStr,
        distance: result.distanceStr,
      });
      setPrimaryManeuver(result.primaryManeuver);
      setUpcomingSteps(result.upcomingSteps);
    }
  };

  const clearRoute = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDestination(null);
    setHasActiveRoute(false);
    setActiveRoute(null);
    setPrimaryManeuver(null);
    setUpcomingSteps([]);
  };

  // Recenter map back to vehicle's live position
  const recenterMap = () => {
    if (mapInstance && position.coords) {
      mapInstance.easeTo({
        center: position.coords,
        zoom: 15.5,
        pitch: 50,
        bearing: position.heading || 0,
        duration: 500,
      });
    }
  };

  return (
    <NavContext.Provider
      value={{
        isNavExpanded,
        setIsNavExpanded,
        hasActiveRoute,
        setHasActiveRoute,
        coords: position.coords,
        destination,
        setDestination,
        heading: position.heading,
        speed: position.speed,
        mapInstance,
        setMapInstance,
        eta,
        primaryManeuver,
        upcomingSteps,
        activeRoute,
        calculateRouteTo,
        clearRoute,
        recenterMap,
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export function useNav(): NavContextType {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within a NavProvider');
  }
  return context;
}
