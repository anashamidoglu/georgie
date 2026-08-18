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
  isLocated: boolean;
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

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  // Default to IDLE state with NO preset destination on refresh
  const [navStatus, setNavStatus] = useState<NavStatus>('idle');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
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
  const positionRef = useRef(position);
  positionRef.current = position;

  // Center map on user position as soon as real location is retrieved on start
  useEffect(() => {
    if (mapInstance && position.isLocated && navStatus === 'idle') {
      mapInstance.setCenter(position.coords);
    }
  }, [mapInstance, position.isLocated, position.coords[0], position.coords[1]]);

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

    try {
      const currentCoords = positionRef.current.coords;
      const result = await fetchDirections(currentCoords, destCoords, MAPBOX_TOKEN, controller.signal);
      setActiveRoute(result);
      setEta({
        arrival: result.arrivalStr,
        duration: result.durationStr,
        distance: result.distanceStr,
      });
      setPrimaryManeuver(result.primaryManeuver);
      setUpcomingSteps(result.upcomingSteps);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Routing calculation error:', e);
      }
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
    setDestinationName('');
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

  return (
    <NavContext.Provider
      value={{
        isNavExpanded,
        setIsNavExpanded,
        navStatus,
        setNavStatus,
        hasActiveRoute: navStatus !== 'idle',
        coords: position.coords,
        isLocated: position.isLocated,
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
