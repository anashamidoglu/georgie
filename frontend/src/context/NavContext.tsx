import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { fetchDirections } from '../services/navService';
import type { RouteResult, ManeuverInfo } from '../services/navService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export type NavStatus = 'idle' | 'preview' | 'navigating';

export interface EtaInfo {
  arrival: string;
  duration: string;
  distance: string;
}

interface NavContextType {
  isNavExpanded: boolean;
  setIsNavExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  navStatus: NavStatus;
  setNavStatus: (status: NavStatus) => void;
  hasActiveRoute: boolean;
  coords: [number, number];
  destination: [number, number] | null;
  destinationName: string;
  heading: number | null;
  speed: number | null;
  mapInstance: MapboxMap | null;
  setMapInstance: (map: MapboxMap | null) => void;
  eta: EtaInfo;
  primaryManeuver: ManeuverInfo | null;
  upcomingSteps: ManeuverInfo[];
  activeRoute: RouteResult | null;
  previewRouteTo: (dest: [number, number], name?: string) => Promise<void>;
  startNavigation: () => void;
  endNavigation: () => void;
  recenterMap: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

// Initial demo destination: Dubai Mall
const DEFAULT_DESTINATION: [number, number] = [55.2785, 25.1972];

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  // Default to active navigation on load
  const [navStatus, setNavStatus] = useState<NavStatus>('navigating');
  const [destination, setDestination] = useState<[number, number] | null>(DEFAULT_DESTINATION);
  const [destinationName, setDestinationName] = useState<string>('Dubai Mall');
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [eta, setEta] = useState<EtaInfo>({
    arrival: '10:30 arrival',
    duration: '20 min',
    distance: '47 km',
  });

  const [primaryManeuver, setPrimaryManeuver] = useState<ManeuverInfo | null>({
    instruction: 'Bear Valley Rd',
    roadName: 'Turn Right',
    distanceStr: '1.5 km',
    type: 'turn',
    modifier: 'right',
  });

  const [upcomingSteps, setUpcomingSteps] = useState<ManeuverInfo[]>([]);

  const position = useCurrentPosition();
  const positionRef = useRef(position);
  positionRef.current = position;

  // Step 2: Route Preview with Confirmation Banner
  const previewRouteTo = async (destCoords: [number, number], name?: string) => {
    setDestination(destCoords);
    setDestinationName(name || 'Pinned Location');
    setNavStatus('preview');

    if (!MAPBOX_TOKEN) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentCoords = positionRef.current.coords;
    const result = await fetchDirections(currentCoords, destCoords, MAPBOX_TOKEN, controller.signal);
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

  // Step 3: Start live 3D follow navigation
  const startNavigation = () => {
    setNavStatus('navigating');
    if (mapInstance && positionRef.current.coords) {
      mapInstance.easeTo({
        center: positionRef.current.coords,
        zoom: 16,
        pitch: 55,
        bearing: positionRef.current.heading || 0,
        duration: 700,
      });
    }
  };

  // End or cancel navigation back to idle
  const endNavigation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDestination(null);
    setNavStatus('idle');
    setActiveRoute(null);
    setPrimaryManeuver(null);
    setUpcomingSteps([]);

    if (mapInstance && positionRef.current.coords) {
      mapInstance.easeTo({
        center: positionRef.current.coords,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        duration: 600,
      });
    }
  };

  // Recenter map back to vehicle's live position
  const recenterMap = () => {
    if (mapInstance && positionRef.current.coords) {
      mapInstance.easeTo({
        center: positionRef.current.coords,
        zoom: navStatus === 'navigating' ? 16 : 15.5,
        pitch: navStatus === 'navigating' ? 55 : 50,
        bearing: positionRef.current.heading || 0,
        duration: 500,
      });
    }
  };

  // Fetch initial route on initial mount if destination is configured
  useEffect(() => {
    if (destination && MAPBOX_TOKEN) {
      fetchDirections(position.coords, destination, MAPBOX_TOKEN).then((result) => {
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
      });
    }
  }, []);

  return (
    <NavContext.Provider
      value={{
        isNavExpanded,
        setIsNavExpanded,
        navStatus,
        setNavStatus,
        hasActiveRoute: navStatus !== 'idle',
        coords: position.coords,
        destination,
        destinationName,
        heading: position.heading,
        speed: position.speed,
        mapInstance,
        setMapInstance,
        eta,
        primaryManeuver,
        upcomingSteps,
        activeRoute,
        previewRouteTo,
        startNavigation,
        endNavigation,
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
