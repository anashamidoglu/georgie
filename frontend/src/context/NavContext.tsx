import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { fetchDirections, checkOffRouteStatus } from '../services/navService';
import type { RouteResult, ManeuverInfo } from '../services/navService';
import { fetchRouteIncidents, getApproachingIncident } from '../services/incidentService';
import type { TrafficIncident } from '../services/incidentService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export type NavStatus = 'idle' | 'preview' | 'navigating';

export interface EtaInfo {
  arrival: string;
  duration: string;
  distance: string;
}

export interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number];
}

// Calculate compass bearing between two coordinates in degrees
function calculateBearing(c1: [number, number] | undefined, c2: [number, number] | undefined): number {
  if (
    !c1 ||
    !c2 ||
    typeof c1[0] !== 'number' ||
    typeof c1[1] !== 'number' ||
    typeof c2[0] !== 'number' ||
    typeof c2[1] !== 'number' ||
    isNaN(c1[0]) ||
    isNaN(c1[1]) ||
    isNaN(c2[0]) ||
    isNaN(c2[1])
  ) {
    return 0;
  }
  const rad = Math.PI / 180;
  const lat1 = c1[1] * rad;
  const lat2 = c2[1] * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  const res = (brng + 360) % 360;
  return isNaN(res) ? 0 : res;
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
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAddStopMode: boolean;
  setIsAddStopMode: (mode: boolean) => void;
  destination: [number, number] | null;
  destinationName: string;
  waypoints: Waypoint[];
  addWaypoint: (name: string, coordinates: [number, number]) => Promise<void>;
  removeWaypoint: (id: string) => Promise<void>;
  moveWaypoint: (fromIndex: number, toIndex: number) => Promise<void>;
  swapWaypointWithDestination: (waypointIndex: number) => Promise<void>;
  reorderStop: (fromIndex: number, toIndex: number) => Promise<void>;
  clearWaypoints: () => void;
  speed: number | null;
  mapInstance: MapboxMap | null;
  setMapInstance: (map: MapboxMap | null) => void;
  eta: EtaInfo;
  primaryManeuver: ManeuverInfo | null;
  upcomingSteps: ManeuverInfo[];
  allSteps: ManeuverInfo[];
  activeRoute: RouteResult | null;
  availableRoutes: RouteResult[];
  selectedRouteIndex: number;
  selectRoute: (index: number) => void;
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

  // Phase 3.5: Real-Time Incident Warnings & Off-Route Engine
  incidents: TrafficIncident[];
  approachingIncident: TrafficIncident | null;
  dismissIncident: (id: string) => void;
  isRerouting: boolean;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAddStopMode, setIsAddStopMode] = useState<boolean>(false);
  const [navStatus, setNavStatus] = useState<NavStatus>('idle');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [inspectedStep, setInspectedStep] = useState<ManeuverInfo | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [simulatedCoords, setSimulatedCoords] = useState<[number, number] | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasExpandedBeforePreviewRef = useRef<boolean>(false);

  // Phase 3.5 & Off-Route state
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [approachingIncident, setApproachingIncident] = useState<TrafficIncident | null>(null);
  const [dismissedIncidentIds, setDismissedIncidentIds] = useState<string[]>([]);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const consecutiveOffRouteCountRef = useRef<number>(0);
  const isReroutingRef = useRef<boolean>(false);

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

  // Internal routing calculation for a given destination + waypoints
  const calculateRoute = async (
    destCoords: [number, number],
    activeWaypoints: Waypoint[],
    _destName?: string
  ) => {
    if (!MAPBOX_TOKEN) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentCoords = positionRef.current.coords;
      const wpCoords = activeWaypoints.map((w) => w.coordinates);
      const res = await fetchDirections(
        currentCoords,
        destCoords,
        wpCoords,
        MAPBOX_TOKEN,
        controller.signal,
        _destName || destinationName || 'Destination',
        activeWaypoints.map((w) => w.name)
      );
      setAvailableRoutes(res.routes);
      setSelectedRouteIndex(0);
      setActiveRoute(res.activeRoute);
      setEta({
        arrival: res.activeRoute.arrivalStr,
        duration: res.activeRoute.durationStr,
        distance: res.activeRoute.distanceStr,
      });
      setAllSteps(res.activeRoute.allSteps);
      setPrimaryManeuver(res.activeRoute.primaryManeuver);
      setUpcomingSteps(res.activeRoute.upcomingSteps);

      // Load traffic incidents along new route polyline
      const routeCoords = res.activeRoute.rawGeometry?.coordinates || [];
      const foundIncidents = await fetchRouteIncidents(routeCoords);
      setIncidents(foundIncidents);
      setDismissedIncidentIds([]);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Routing calculation error:', e);
      }
    }
  };

  // Step 2: Route Preview with Multi-Route Candidate Calculation
  const previewRouteTo = async (destCoords: [number, number], name?: string) => {
    if (navStatus === 'idle') {
      wasExpandedBeforePreviewRef.current = isNavExpanded;
    }
    setDestination(destCoords);
    setDestinationName(name || 'Pinned Location');
    setWaypoints([]);
    setNavStatus('preview');
    setIsNavExpanded(false);
    setInspectedStep(null);
    setActiveStepIndex(0);
    setSimulatedCoords(null);
    setSimulatedHeading(0);
    setSelectedRouteIndex(0);

    await calculateRoute(destCoords, [], name);
  };

  // Multi-Stop: Add Waypoint
  const addWaypoint = async (name: string, coords: [number, number]) => {
    if (!destination) return;
    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name,
      coordinates: coords,
    };
    const updated = [...waypoints, newWp];
    setWaypoints(updated);
    setActiveStepIndex(0);
    setInspectedStep(null);
    await calculateRoute(destination, updated, destinationName);
  };

  // Multi-Stop: Remove Waypoint
  const removeWaypoint = async (id: string) => {
    if (!destination) return;
    const updated = waypoints.filter((w) => w.id !== id);
    setWaypoints(updated);
    setActiveStepIndex(0);
    setInspectedStep(null);
    await calculateRoute(destination, updated, destinationName);
  };

  // Multi-Stop: Reorder Waypoint
  const moveWaypoint = async (fromIndex: number, toIndex: number) => {
    if (!destination) return;
    if (fromIndex < 0 || fromIndex >= waypoints.length || toIndex < 0 || toIndex >= waypoints.length) return;
    const updated = [...waypoints];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setWaypoints(updated);
    setActiveStepIndex(0);
    setInspectedStep(null);
    await calculateRoute(destination, updated, destinationName);
  };

  // Multi-Stop: Swap an intermediate stop to become the final destination
  const swapWaypointWithDestination = async (waypointIndex: number) => {
    if (!destination || !waypoints[waypointIndex]) return;
    const targetWp = waypoints[waypointIndex];
    const oldDestCoords = destination;
    const oldDestName = destinationName;

    const newWaypoints = [...waypoints];
    newWaypoints[waypointIndex] = {
      id: `wp-${Date.now()}`,
      name: oldDestName,
      coordinates: oldDestCoords,
    };

    setDestination(targetWp.coordinates);
    setDestinationName(targetWp.name);
    setWaypoints(newWaypoints);
    setActiveStepIndex(0);
    setInspectedStep(null);
    await calculateRoute(targetWp.coordinates, newWaypoints, targetWp.name);
  };

  // Multi-Stop: Reorder any stop across the entire itinerary (including final destination)
  const reorderStop = async (fromIdx: number, toIdx: number) => {
    if (!destination) return;
    const allStops: Array<{ id: string; name: string; coordinates: [number, number] }> = [
      ...waypoints,
      { id: 'final-dest', name: destinationName, coordinates: destination },
    ];

    if (fromIdx < 0 || fromIdx >= allStops.length || toIdx < 0 || toIdx >= allStops.length) return;

    const [moved] = allStops.splice(fromIdx, 1);
    if (!moved) return;
    allStops.splice(toIdx, 0, moved);

    const newDest = allStops[allStops.length - 1];
    if (!newDest || !newDest.coordinates) return;

    const newWaypoints = allStops.slice(0, allStops.length - 1).map((s, idx) => ({
      id: s.id.startsWith('wp-') ? s.id : `wp-${Date.now()}-${idx}`,
      name: s.name,
      coordinates: s.coordinates,
    }));

    setDestination(newDest.coordinates);
    setDestinationName(newDest.name);
    setWaypoints(newWaypoints);
    setActiveStepIndex(0);
    setInspectedStep(null);
    await calculateRoute(newDest.coordinates, newWaypoints, newDest.name);
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    setActiveStepIndex(0);
    setInspectedStep(null);
    if (destination) {
      calculateRoute(destination, [], destinationName);
    }
  };

  // Switch between alternative routes
  const selectRoute = async (index: number) => {
    if (!availableRoutes[index]) return;
    const targetRoute = availableRoutes[index];
    setSelectedRouteIndex(index);
    setActiveRoute(targetRoute);
    setEta({
      arrival: targetRoute.arrivalStr,
      duration: targetRoute.durationStr,
      distance: targetRoute.distanceStr,
    });
    setAllSteps(targetRoute.allSteps);
    setPrimaryManeuver(targetRoute.primaryManeuver);
    setUpcomingSteps(targetRoute.upcomingSteps);
    setInspectedStep(null);
    setActiveStepIndex(0);

    const routeCoords = targetRoute.rawGeometry?.coordinates || [];
    const foundIncidents = await fetchRouteIncidents(routeCoords);
    setIncidents(foundIncidents);
  };

  // Dismiss an incident alert banner manually or via timer
  const dismissIncident = (id: string) => {
    setDismissedIncidentIds((prev) => [...prev, id]);
    if (approachingIncident?.id === id) {
      setApproachingIncident(null);
    }
  };

  // Automatic Off-Route Dynamic Reroute Engine
  const triggerAutoReroute = async (currentPos: [number, number]) => {
    if (isReroutingRef.current || !destination || !MAPBOX_TOKEN) return;
    isReroutingRef.current = true;
    setIsRerouting(true);

    try {
      const wpCoords = waypoints.map((w) => w.coordinates);
      const res = await fetchDirections(
        currentPos,
        destination,
        wpCoords,
        MAPBOX_TOKEN,
        undefined,
        destinationName,
        waypoints.map((w) => w.name)
      );

      if (res.routes.length > 0) {
        const updated = res.routes[0];
        setAvailableRoutes(res.routes);
        setSelectedRouteIndex(0);
        setActiveRoute(updated);
        setEta({
          arrival: updated.arrivalStr,
          duration: updated.durationStr,
          distance: updated.distanceStr,
        });
        setAllSteps(updated.allSteps);
        setPrimaryManeuver(updated.primaryManeuver);
        setUpcomingSteps(updated.upcomingSteps);
        setActiveStepIndex(0);

        const routeCoords = updated.rawGeometry?.coordinates || [];
        const incs = await fetchRouteIncidents(routeCoords);
        setIncidents(incs);
      }
    } catch (e) {
      console.warn('Off-route dynamic auto-reroute failed:', e);
    } finally {
      consecutiveOffRouteCountRef.current = 0;
      setTimeout(() => {
        isReroutingRef.current = false;
        setIsRerouting(false);
      }, 700);
    }
  };

  // Continuous monitoring for Approaching Incidents & Off-Route status during active navigation
  useEffect(() => {
    if (navStatus !== 'navigating' || !activeRoute?.rawGeometry?.coordinates) return;

    const routeCoords = activeRoute.rawGeometry.coordinates;

    // 1. Check Off-Route status
    const offRouteCheck = checkOffRouteStatus(vehicleCoords, routeCoords, 35);
    if (offRouteCheck.isOffRoute) {
      consecutiveOffRouteCountRef.current += 1;
      if (consecutiveOffRouteCountRef.current >= 2) {
        triggerAutoReroute(vehicleCoords);
      }
    } else {
      consecutiveOffRouteCountRef.current = 0;
    }

    // 2. Check Approaching Incidents
    const nextInc = getApproachingIncident(vehicleCoords, incidents, routeCoords);
    if (nextInc && !dismissedIncidentIds.includes(nextInc.id)) {
      setApproachingIncident(nextInc);
    } else {
      setApproachingIncident(null);
    }
  }, [vehicleCoords[0], vehicleCoords[1], navStatus, activeRoute, incidents, dismissedIncidentIds]);

  // 60-second live background ETA & traffic recalculation during active navigation
  useEffect(() => {
    if (navStatus !== 'navigating' || !destination || !MAPBOX_TOKEN) return;

    const interval = setInterval(async () => {
      try {
        const currentCoords = positionRef.current.coords;
        const wpCoords = waypoints.map((w) => w.coordinates);
        const res = await fetchDirections(
          currentCoords,
          destination,
          wpCoords,
          MAPBOX_TOKEN,
          undefined,
          destinationName,
          waypoints.map((w) => w.name)
        );
        if (res.routes.length > 0) {
          const updatedRoute = res.routes[selectedRouteIndex] || res.activeRoute;
          setAvailableRoutes(res.routes);
          setActiveRoute(updatedRoute);
          setEta({
            arrival: updatedRoute.arrivalStr,
            duration: updatedRoute.durationStr,
            distance: updatedRoute.distanceStr,
          });
        }
      } catch (e) {
        console.warn('Background traffic recalculation failed:', e);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navStatus, destination, waypoints, selectedRouteIndex, destinationName]);

  // Step 3: Start live 3D driver follow navigation (angled behind vehicle in direction of travel)
  const startNavigation = () => {
    setNavStatus('navigating');
    setInspectedStep(null);
    setActiveStepIndex(0);
    if (activeRoute) {
      setAllSteps(activeRoute.allSteps);
      setPrimaryManeuver(activeRoute.primaryManeuver);
      setUpcomingSteps(activeRoute.upcomingSteps);
    }
    if (wasExpandedBeforePreviewRef.current) {
      setIsNavExpanded(true);
    }
    if (mapInstance) {
      const currentLoc = vehicleCoords;
      const firstStep = allSteps[0];
      const nextLoc = allSteps[1]?.location || destination || currentLoc;
      const bearing =
        typeof firstStep?.bearingAfter === 'number'
          ? firstStep.bearingAfter
          : calculateBearing(currentLoc, nextLoc);
      setSimulatedHeading(bearing);

      mapInstance.easeTo({
        center: currentLoc,
        zoom: 18.0,
        pitch: 62,
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
      const bearing =
        typeof step.bearingAfter === 'number'
          ? step.bearingAfter
          : nextStep && nextStep.location
          ? calculateBearing(step.location, nextStep.location)
          : 0;
      setSimulatedHeading(bearing);

      mapInstance.easeTo({
        center: step.location,
        zoom: 18.0,
        pitch: 62,
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
      if (navStatus === 'preview' && activeRoute?.rawGeometry) {
        let minLng = positionRef.current.coords[0];
        let maxLng = positionRef.current.coords[0];
        let minLat = positionRef.current.coords[1];
        let maxLat = positionRef.current.coords[1];

        availableRoutes.forEach((r) => {
          r.rawGeometry?.coordinates.forEach(([lng, lat]: [number, number]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          });
        });

        mapInstance.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: { top: 60, bottom: 90, left: 50, right: 50 },
            maxZoom: 15,
            pitch: 15,
            bearing: 0,
            duration: 800,
          }
        );
      } else {
        const currentLoc = positionRef.current.coords;
        const currentStep = allSteps[activeStepIndex];
        const nextStep = allSteps[activeStepIndex + 1];
        const bearing =
          typeof currentStep?.bearingAfter === 'number'
            ? currentStep.bearingAfter
            : nextStep?.location
            ? calculateBearing(currentLoc, nextStep.location)
            : positionRef.current.heading || 0;

        mapInstance.easeTo({
          center: currentLoc,
          zoom: navStatus === 'navigating' ? 18.0 : 15.5,
          pitch: navStatus === 'navigating' ? 62 : 50,
          bearing: bearing,
          duration: 800,
        });
      }
    }
  };

  // Simulation controls: Move vehicle puck along the route and angle camera directly behind vehicle looking ahead
  const nextSimulationStep = () => {
    if (allSteps.length === 0) return;
    const nextIdx = Math.min(allSteps.length - 1, activeStepIndex + 1);
    setActiveStepIndex(nextIdx);
    setPrimaryManeuver(allSteps[nextIdx]);
    setUpcomingSteps(allSteps.slice(nextIdx + 1));

    const step = allSteps[nextIdx];
    const stepLoc = step?.location;
    if (stepLoc) {
      setSimulatedCoords(stepLoc);
      const nextStepLoc = allSteps[nextIdx + 1]?.location || destination;
      const bearing =
        typeof step?.bearingAfter === 'number'
          ? step.bearingAfter
          : nextStepLoc
          ? calculateBearing(stepLoc, nextStepLoc)
          : vehicleHeading;
      setSimulatedHeading(bearing);

      if (mapInstance) {
        mapInstance.easeTo({
          center: stepLoc,
          zoom: 18.0,
          pitch: 62,
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

    const step = allSteps[prevIdx];
    const stepLoc = step?.location;
    if (stepLoc) {
      setSimulatedCoords(stepLoc);
      const nextStepLoc = allSteps[prevIdx + 1]?.location || destination;
      const bearing =
        typeof step?.bearingAfter === 'number'
          ? step.bearingAfter
          : nextStepLoc
          ? calculateBearing(stepLoc, nextStepLoc)
          : vehicleHeading;
      setSimulatedHeading(bearing);

      if (mapInstance) {
        mapInstance.easeTo({
          center: stepLoc,
          zoom: 18.0,
          pitch: 62,
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
    setWaypoints([]);
    setNavStatus('idle');
    setActiveRoute(null);
    setAvailableRoutes([]);
    setSelectedRouteIndex(0);
    setPrimaryManeuver(null);
    setUpcomingSteps([]);
    setAllSteps([]);
    setInspectedStep(null);
    setActiveStepIndex(0);
    setSimulatedCoords(null);
    setSimulatedHeading(0);
    setIncidents([]);
    setApproachingIncident(null);
    setDismissedIncidentIds([]);
    setIsRerouting(false);
    consecutiveOffRouteCountRef.current = 0;
    isReroutingRef.current = false;

    if (wasExpandedBeforePreviewRef.current) {
      setIsNavExpanded(true);
    }
    wasExpandedBeforePreviewRef.current = false;

    const startPos = positionRef.current.coords;
    if (mapInstance && startPos) {
      mapInstance.flyTo({
        center: startPos,
        zoom: 15.5,
        pitch: 50,
        bearing: 0,
        duration: 800,
        essential: true,
      });

      setTimeout(() => {
        if (mapInstance) {
          mapInstance.resize();
          mapInstance.flyTo({
            center: startPos,
            zoom: 15.5,
            pitch: 50,
            bearing: 0,
            duration: 400,
            essential: true,
          });
        }
      }, 350);
    }
  };

  // Recenter map back to vehicle's live position
  const recenterMap = () => {
    setInspectedStep(null);
    setSimulatedCoords(null);
    setSimulatedHeading(0);
    if (mapInstance && positionRef.current.coords) {
      mapInstance.flyTo({
        center: positionRef.current.coords,
        zoom: navStatus === 'navigating' ? 16.5 : 15.5,
        pitch: navStatus === 'navigating' ? 58 : 50,
        bearing: positionRef.current.heading || 0,
        duration: 800,
        essential: true,
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
        isSearchOpen,
        setIsSearchOpen,
        isAddStopMode,
        setIsAddStopMode,
        destination,
        destinationName,
        waypoints,
        addWaypoint,
        removeWaypoint,
        moveWaypoint,
        swapWaypointWithDestination,
        reorderStop,
        clearWaypoints,
        speed: position.speed,
        mapInstance,
        setMapInstance,
        eta,
        primaryManeuver,
        upcomingSteps,
        allSteps,
        activeRoute,
        availableRoutes,
        selectedRouteIndex,
        selectRoute,
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

        // Phase 3.5 & Off-route
        incidents,
        approachingIncident,
        dismissIncident,
        isRerouting,
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNav = (): NavContextType => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within a NavProvider');
  }
  return context;
};
