import React, { createContext, useContext, useState, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { fetchDirections } from '../services/navService';
import type { RouteResult, ManeuverInfo } from '../services/navService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export type NavStatus = 'idle' | 'preview' | 'navigating';

interface EtaInfo {
  arrival: string;
  duration: string;
  distance: string;
}

interface NavContextType {
  isNavExpanded: boolean;
  setIsNavExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  navStatus: NavStatus;
  setNavStatus: (status: NavStatus) => void;
  coords: [number, number];
  destination: [number, number] | null;
  destinationName: string;
  setDestination: (dest: [number, number] | null) => void;
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
  const [navStatus, setNavStatus] = useState<NavStatus>('idle');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationName, setDestinationName] = useState<string>('Selected Destination');
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

  // Step 2: Preview route to target destination with route overview
  const previewRouteTo = async (destCoords: [number, number], name?: string) => {
    setDestination(destCoords);
    setDestinationName(name || 'Selected Location');
    setNavStatus('preview');

    if (!MAPBOX_TOKEN) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

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

  // Step 3: Start live 3D navigation
  const startNavigation = () => {
    setNavStatus('navigating');
    if (mapInstance && position.coords) {
      mapInstance.easeTo({
        center: position.coords,
        zoom: 16,
        pitch: 55,
        bearing: position.heading || 0,
        duration: 800,
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

    if (mapInstance && position.coords) {
      mapInstance.easeTo({
        center: position.coords,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        duration: 800,
      });
    }
  };

  // Recenter map back to vehicle's live position
  const recenterMap = () => {
    if (mapInstance && position.coords) {
      mapInstance.easeTo({
        center: position.coords,
        zoom: navStatus === 'navigating' ? 16 : 15.5,
        pitch: navStatus === 'navigating' ? 55 : 50,
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
        navStatus,
        setNavStatus,
        coords: position.coords,
        destination,
        destinationName,
        setDestination,
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
