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

// Calculate compass bearing between two coordinates in degrees
function calculateBearing(c1: [number, number], c2: [number, number]): number {
  const rad = Math.PI / 180;
  const lat1 = c1[1] * rad;
  const lat2 = c2[1] * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

interface NavContextType {
  isNavExpanded: boolean;
  setIsNavExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  navStatus: NavStatus;
  setNavStatus: (status: NavStatus) => void;
  hasActiveRoute: boolean;
  coords: [number, number];
  vehicleCoords: [number, number];
  vehicleHeading: number;
  isLocated: boolean;
  destination: [number, number] | null;
  destinationName: string;
  speed: number | null;
  mapInstance: MapboxMap | null;
  setMapInstance: (map: MapboxMap | null) => void;
  eta: EtaInfo;
  primaryManeuver: ManeuverInfo | null;
  upcomingSteps: ManeuverInfo[];
  allSteps: ManeuverInfo[];
  activeRoute: RouteResult | null;
  inspectedStep: ManeuverInfo | null;
  inspectStep: (step: ManeuverInfo) => void;
  clearInspectedStep: () => void;
  activeStepIndex: number;
  nextSimulationStep: () => void;
  prevSimulationStep: () => void;
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
  const [destinationName, setDestinationName] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [inspectedStep, setInspectedStep] = useState<ManeuverInfo | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [simulatedCoords, setSimulatedCoords] = useState<[number, number] | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [eta, setEta] = useState<EtaInfo>({
    arrival: '--:--',
    duration: '-- min',
    distance: '-- km',
  });

  const [primaryManeuver, setPrimaryManeuver] = useState<ManeuverInfo | null>(null);
  const [upcomingSteps, setUpcomingSteps] = useState<ManeuverInfo[]>([]);
  const [allSteps, setAllSteps] = useState<ManeuverInfo[]>([]);

  const position = useCurrentPosition();
  const positionRef = useRef(position);
  positionRef.current = position;

  // Active vehicle coordinates (falls back to real GPS, advances with simulation/inspection)
  const vehicleCoords = simulatedCoords || position.coords;
  const vehicleHeading = simulatedHeading || position.heading || 0;

  // Center map on user position as soon as real location is retrieved on start
  useEffect(() => {
    if (mapInstance && position.isLocated && navStatus === 'idle' && !simulatedCoords) {
      mapInstance.setCenter(position.coords);
    }
  }, [mapInstance, position.isLocated, position.coords[0], position.coords[1]]);

  // Step 2: Route Preview with Confirmation Banner
  const previewRouteTo = async (destCoords: [number, number], name?: string) => {
    setDestination(destCoords);
    setDestinationName(name || 'Pinned Location');
    setNavStatus('preview');
    setInspectedStep(null);
    setActiveStepIndex(0);
    setSimulatedCoords(null);
    setSimulatedHeading(0);

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
      setAllSteps(result.allSteps);
      setPrimaryManeuver(result.primaryManeuver);
      setUpcomingSteps(result.upcomingSteps);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Routing calculation error:', e);
      }
    }
  };

  // Step 3: Start live 3D driver follow navigation (angled behind vehicle in direction of travel)
  const startNavigation = () => {
    setNavStatus('navigating');
    setInspectedStep(null);
    if (mapInstance) {
      const currentLoc = vehicleCoords;
      const nextLoc = allSteps[1]?.location || destination || currentLoc;
      const bearing = calculateBearing(currentLoc, nextLoc);
      setSimulatedHeading(bearing);

      mapInstance.easeTo({
        center: currentLoc,
        zoom: 16.5,
        pitch: 58,
        bearing: bearing,
        duration: 800,
      });
    }
  };

  // Interactive Step Inspector: Jump dot to clicked maneuver & angle camera along that road segment
  const inspectStep = (step: ManeuverInfo) => {
    setInspectedStep(step);
    setSimulatedCoords(step.location);

    if (mapInstance && step.location) {
      const stepIdx = allSteps.findIndex((s) => s.id === step.id);
      const nextStep = allSteps[stepIdx + 1] || allSteps[stepIdx];
      const bearing = nextStep && nextStep.location ? calculateBearing(step.location, nextStep.location) : 0;
      setSimulatedHeading(bearing);

      mapInstance.easeTo({
        center: step.location,
        zoom: 16.5,
        pitch: 55,
        bearing: bearing,
        duration: 700,
      });
    }
  };

  // Return from inspected step back to full route overview or driver follow
  const clearInspectedStep = () => {
    setInspectedStep(null);
    setSimulatedCoords(null);
    setSimulatedHeading(0);

    if (mapInstance) {
      if (navStatus === 'preview' && activeRoute?.geoJson) {
        const coordinates = activeRoute.geoJson.geometry.coordinates;
        if (coordinates.length > 0) {
          const firstCoord = coordinates[0] as [number, number];
          const bounds = new (window as any).mapboxgl.LngLatBounds(firstCoord, firstCoord);
          coordinates.forEach((coord: any) => bounds.extend(coord));
          mapInstance.fitBounds(bounds, {
            padding: { top: 60, bottom: 85, left: 45, right: 45 },
            maxZoom: 15,
            pitch: 15,
            duration: 700,
          });
        }
      } else if (positionRef.current.coords) {
        const bearing = positionRef.current.heading || 0;
        mapInstance.easeTo({
          center: positionRef.current.coords,
          zoom: navStatus === 'navigating' ? 16.5 : 15.5,
          pitch: navStatus === 'navigating' ? 58 : 50,
          bearing: bearing,
          duration: 600,
        });
      }
    }
  };

  // Simulation controls: Move vehicle puck along the route and angle camera behind vehicle looking ahead
  const nextSimulationStep = () => {
    if (allSteps.length === 0) return;
    const nextIdx = Math.min(allSteps.length - 1, activeStepIndex + 1);
    setActiveStepIndex(nextIdx);
    setPrimaryManeuver(allSteps[nextIdx]);
    setUpcomingSteps(allSteps.slice(nextIdx + 1));

    const stepLoc = allSteps[nextIdx]?.location;
    if (stepLoc) {
      setSimulatedCoords(stepLoc);
      const nextStepLoc = allSteps[nextIdx + 1]?.location || destination || stepLoc;
      const bearing = calculateBearing(stepLoc, nextStepLoc);
      setSimulatedHeading(bearing);

      if (mapInstance) {
        mapInstance.easeTo({
          center: stepLoc,
          zoom: 16.5,
          pitch: 58,
          bearing: bearing,
          duration: 600,
        });
      }
    }
  };

  const prevSimulationStep = () => {
    if (allSteps.length === 0) return;
    const prevIdx = Math.max(0, activeStepIndex - 1);
    setActiveStepIndex(prevIdx);
    setPrimaryManeuver(allSteps[prevIdx]);
    setUpcomingSteps(allSteps.slice(prevIdx + 1));

    const stepLoc = allSteps[prevIdx]?.location;
    if (stepLoc) {
      setSimulatedCoords(stepLoc);
      const nextStepLoc = allSteps[prevIdx + 1]?.location || destination || stepLoc;
      const bearing = calculateBearing(stepLoc, nextStepLoc);
      setSimulatedHeading(bearing);

      if (mapInstance) {
        mapInstance.easeTo({
          center: stepLoc,
          zoom: 16.5,
          pitch: 58,
          bearing: bearing,
          duration: 600,
        });
      }
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
    setAllSteps([]);
    setInspectedStep(null);
    setActiveStepIndex(0);
    setSimulatedCoords(null);
    setSimulatedHeading(0);

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
    setInspectedStep(null);
    setSimulatedCoords(null);
    setSimulatedHeading(0);
    if (mapInstance && positionRef.current.coords) {
      mapInstance.easeTo({
        center: positionRef.current.coords,
        zoom: navStatus === 'navigating' ? 16.5 : 15.5,
        pitch: navStatus === 'navigating' ? 58 : 50,
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
        vehicleCoords,
        vehicleHeading,
        isLocated: position.isLocated,
        destination,
        destinationName,
        speed: position.speed,
        mapInstance,
        setMapInstance,
        eta,
        primaryManeuver,
        upcomingSteps,
        allSteps,
        activeRoute,
        inspectedStep,
        inspectStep,
        clearInspectedStep,
        activeStepIndex,
        nextSimulationStep,
        prevSimulationStep,
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
