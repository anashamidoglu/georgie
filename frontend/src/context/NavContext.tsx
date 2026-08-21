import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { fetchDirections, checkOffRouteStatus } from '../services/navService';
import type { RouteResult, ManeuverInfo } from '../services/navService';
import { routeSimulator, type SimulatorTick } from '../services/routeSimulator';

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

function formatDistanceMetric(meters: number): string {
  if (meters <= 0) return 'Now';
  if (meters < 100) return `${Math.max(0, Math.round(meters))} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
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
  isStreetViewOpen: boolean;
  setIsStreetViewOpen: (open: boolean) => void;
  openStreetView: () => void;
  closeStreetView: () => void;
  nextInspectedStep: () => void;
  prevInspectedStep: () => void;
  activeStepIndex: number;
  nextSimulationStep: () => void;
  prevSimulationStep: () => void;
  previewRouteTo: (dest: [number, number], name?: string) => Promise<void>;
  startNavigation: () => void;
  endNavigation: () => void;
  recenterMap: () => void;

  // Off-Route Dynamic Rerouting & Dev Testing
  isRerouting: boolean;
  simulateOffRoute: () => void;
  resetSimulatedPosition: () => void;

  // Voice Guidance (TTS)
  isVoiceMuted: boolean;
  toggleVoiceMute: () => void;
  speakTurn: (text: string, priority?: string) => Promise<void>;

  // Option 3: Full Driver Telemetry & Kinematics Simulator
  simSpeedKmh: number;
  simThrottle: number;
  simBrake: number;
  simIsCruising: boolean;
  simCruiseSpeedKmh: number;
  simIsFreeSteering: boolean;
  simProgressRatio: number;
  simDistanceAlongRoute: number;
  simTotalDistance: number;
  simDistanceToNextManeuver: number;
  simIsReversing: boolean;
  setSimulatorThrottle: (val: number) => void;
  setSimulatorBrake: (val: number) => void;
  setSimulatorSteering: (val: number) => void;
  setSimulatorReversing: (val: boolean) => void;
  toggleSimulatorCruise: (targetKmh?: number) => void;
  setSimulatorCruiseSpeed: (kmh: number) => void;
  toggleSimulatorFreeSteer: () => void;
  snapSimulatorToRoute: () => void;
  seekSimulatorPercent: (pct: number) => void;
  jumpBeforeSimulatorStep: (stepIdx: number, metersBefore?: number) => void;
  simulateWrongTurn: (angleDeg?: number) => void;
  emergencyStopSimulator: () => void;
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
  const [isStreetViewOpen, setIsStreetViewOpen] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [simulatedCoords, setSimulatedCoords] = useState<[number, number] | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wasExpandedBeforePreviewRef = useRef<boolean>(false);

  // Synchronized refs to guarantee zero stale closures during driving simulation & rerouting
  const allStepsRef = useRef<ManeuverInfo[]>([]);
  const activeRouteRef = useRef<RouteResult | null>(null);

  // Off-Route Engine State
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

  // Option 3: Kinematic Driver Simulation State
  const [simTick, setSimTick] = useState<SimulatorTick>(() => routeSimulator.getSnapshot());
  const announcedMilestonesRef = useRef<{ [stepId: number]: Record<string, boolean> }>({});
  const arrivalAnnouncedRef = useRef<boolean>(false);

  // Active vehicle coordinates (prioritizes inspected step in preview/St.View mode, simulator during driving, real GPS when idle)
  const isInspectingStep = inspectedStep !== null && Array.isArray(inspectedStep.location) && inspectedStep.location.length === 2;
  const isNavigating = navStatus === 'navigating' && simulatedCoords !== null;
  const vehicleCoords = isInspectingStep
    ? inspectedStep.location
    : isNavigating
    ? simulatedCoords
    : position.coords;
  const vehicleHeading = isInspectingStep
    ? (simulatedHeading || 0)
    : isNavigating
    ? (simulatedHeading || position.heading || 0)
    : (position.heading || 0);

  // Keep routeSimulator synchronized to real GPS coordinates when in idle mode
  useEffect(() => {
    if (position.isLocated) {
      routeSimulator.syncRealLocation(position.coords, position.heading || 0);
    }
  }, [position.coords[0], position.coords[1], position.heading, position.isLocated]);

  // Center map on user's real GPS position when located in idle mode
  useEffect(() => {
    if (mapInstance && position.isLocated && navStatus === 'idle') {
      mapInstance.setCenter(position.coords);
    }
  }, [mapInstance, position.isLocated, position.coords[0], position.coords[1], navStatus]);

  // Voice Guidance (TTS) State
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('georgie_voice_muted') === 'true';
    } catch {
      return false;
    }
  });

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    fetch('/api/nav/voice/stop', { method: 'POST' }).catch(() => {});
  };

  const toggleVoiceMute = () => {
    setIsVoiceMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('georgie_voice_muted', String(next));
      } catch {}
      if (next) {
        stopCurrentAudio();
      }
      return next;
    });
  };

  const speakTurn = async (text: string, _priority: string = 'normal') => {
    if (isVoiceMuted || !text || !text.trim()) return;

    // 1. Immediately cut off any previously playing Neural audio stream
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }

    // 2. Play high-fidelity Microsoft Edge Neural TTS stream (JennyNeural)
    try {
      const audioUrl = `/api/nav/voice/audio?text=${encodeURIComponent(text.trim())}`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = 1.08; // Crisp, responsive playback pace
      currentAudioRef.current = audio;

      audio.play().catch(() => {});

      audio.onended = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      };
    } catch (err) {
      console.warn('Neural audio playback error:', err);
    }
  };

  // Helper to format concise, natural spoken navigation instructions
  const formatSpokenInstruction = (maneuver: ManeuverInfo | null, prefixDistance?: string) => {
    if (!maneuver) return '';
    let instr = maneuver.instruction || maneuver.roadName || 'Continue on route';

    // 1. Simplify multi-part slash road names to primary English name or route code
    if (instr.includes('/')) {
      const rawParts = instr.split('/').map((p) => p.trim()).filter(Boolean);
      const primaryPart = rawParts.find((p) => /^[A-Za-z]\d+$/.test(p) || /[a-zA-Z]/.test(p)) || rawParts[0];
      instr = primaryPart;
    }

    // 2. Clean up road abbreviations for crisp speech
    instr = instr
      .replace(/\bRd\b\.?/g, 'Road')
      .replace(/\bSt\b\.?/g, 'Street')
      .replace(/\bAve\b\.?/g, 'Avenue')
      .replace(/\bBlvd\b\.?/g, 'Boulevard')
      .replace(/\bDr\b\.?/g, 'Drive')
      .replace(/\bHwy\b\.?/g, 'Highway')
      .replace(/\bShk\b\.?/g, 'Sheikh')
      .replace(/\bSh\b\.?/g, 'Sheikh')
      .replace(/\bExit\s*(\d+)/gi, 'Exit $1')
      .replace(/\b([ED])(\d+)\b/g, '$1 $2');

    // 3. Prefix distance if provided
    if (prefixDistance) {
      const cleanDist = prefixDistance
        .replace(/(\d+(?:\.\d+)?)\s*m\b/gi, '$1 meters')
        .replace(/(\d+(?:\.\d+)?)\s*km\b/gi, '$1 kilometers');
      return `In ${cleanDist}, ${instr.charAt(0).toLowerCase() + instr.slice(1)}`;
    }
    return instr;
  };

  // Continuous Kinematic Simulator Telemetry Subscription
  useEffect(() => {
    const unsubscribe = routeSimulator.subscribe((tick) => {
      setSimTick(tick);
      if (navStatus === 'navigating') {
        setSimulatedCoords(tick.coords);
        setSimulatedHeading(tick.heading);
      }

      if (navStatus === 'navigating') {
        // 1. Dynamic Live ETA Updating as you drive
        const currentRoute = activeRouteRef.current;
        if (currentRoute && currentRoute.totalDistanceMeters > 0) {
          const remainingMeters = Math.max(0, currentRoute.totalDistanceMeters - tick.distanceAlongRoute);
          const distFormatted = formatDistanceMetric(remainingMeters);

          const progress = currentRoute.totalDistanceMeters > 0
            ? tick.distanceAlongRoute / currentRoute.totalDistanceMeters
            : 0;
          const remainingSeconds = Math.max(0, Math.round(currentRoute.totalDurationSeconds * (1 - progress)));

          const durationMin = Math.ceil(remainingSeconds / 60);
          const durationFormatted = durationMin > 60
            ? `${Math.floor(durationMin / 60)} hr ${durationMin % 60} min`
            : `${durationMin} min`;

          const arrivalDate = new Date(Date.now() + remainingSeconds * 1000);
          const hours = arrivalDate.getHours();
          const minutes = arrivalDate.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const formattedHours = hours % 12 || 12;
          const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
          const arrivalFormatted = `${formattedHours}:${formattedMinutes} ${ampm}`;

          setEta({
            arrival: arrivalFormatted,
            duration: durationFormatted,
            distance: distFormatted,
          });
        }

        // 2. Dynamic Turn Banner, Active Step & Upcoming Maneuvers
        const steps = allStepsRef.current;
        if (steps.length > 0) {
          const targetStepIdx = Math.min(steps.length - 1, Math.max(0, tick.activeStepIndex));
          const currentStep = steps[targetStepIdx];
          const distStr = formatDistanceMetric(tick.distanceToNextManeuver);

          setActiveStepIndex(targetStepIdx);
          setPrimaryManeuver({
            ...currentStep,
            distanceMeters: tick.distanceToNextManeuver,
            distanceStr: distStr,
          });

          // Dynamically compute real-time remaining distance from vehicle position to every upcoming step
          const dynamicUpcoming = steps.slice(targetStepIdx + 1).map((step, sliceIdx) => {
            const globalIdx = targetStepIdx + 1 + sliceIdx;
            const targetCumDist =
              tick.stepCumulativeDistances && tick.stepCumulativeDistances[globalIdx] !== undefined
                ? tick.stepCumulativeDistances[globalIdx]
                : currentRoute?.totalDistanceMeters ?? 0;
            const remainingMeters = Math.max(0, Math.round(targetCumDist - tick.distanceAlongRoute));
            return {
              ...step,
              distanceMeters: remainingMeters,
              distanceStr: formatDistanceMetric(remainingMeters),
            };
          });
          setUpcomingSteps(dynamicUpcoming);

          // 3. Dynamic Voice Milestone Prompts (5km, 3km, 1km, 500m, 250m, 100m, and ~25-35m immediate prompt)
          if (!isVoiceMuted && currentStep) {
            const stepId = currentStep.id ?? targetStepIdx;
            if (!announcedMilestonesRef.current[stepId]) {
              announcedMilestonesRef.current[stepId] = {};
            }
            const milestones = announcedMilestonesRef.current[stepId];
            const d = tick.distanceToNextManeuver;

            // 1. 5 km prompt
            if (d <= 5150 && d > 4800 && !milestones.p5km) {
              milestones.p5km = true;
              speakTurn(formatSpokenInstruction(currentStep, '5 kilometers'));
            }
            // 2. 3 km prompt
            else if (d <= 3150 && d > 2800 && !milestones.p3km) {
              milestones.p3km = true;
              speakTurn(formatSpokenInstruction(currentStep, '3 kilometers'));
            }
            // 3. 1 km prompt
            else if (d <= 1080 && d > 920 && !milestones.p1km) {
              milestones.p1km = true;
              speakTurn(formatSpokenInstruction(currentStep, '1 kilometer'));
            }
            // 4. 500 m prompt
            else if (d <= 530 && d > 450 && !milestones.p500m) {
              milestones.p500m = true;
              speakTurn(formatSpokenInstruction(currentStep, '500 meters'));
            }
            // 5. 250 m prompt
            else if (d <= 270 && d > 210 && !milestones.p250m) {
              milestones.p250m = true;
              speakTurn(formatSpokenInstruction(currentStep, '250 meters'));
            }
            // 6. 100 m prompt
            else if (d <= 115 && d > 75 && !milestones.p100m) {
              milestones.p100m = true;
              speakTurn(formatSpokenInstruction(currentStep, '100 meters'));
            }
            // 7. Immediate execution prompt (right before turn/exit/roundabout: 25-35m)
            else if (d <= 35 && d > 6 && !milestones.now) {
              milestones.now = true;
              speakTurn(formatSpokenInstruction(currentStep));
            }
          }

          // 4. Destination Arrival Trigger
          if (tick.isFinished && !arrivalAnnouncedRef.current) {
            arrivalAnnouncedRef.current = true;
            speakTurn(`You have reached your destination: ${destinationName || 'your destination'}`);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [navStatus, isVoiceMuted, destinationName]);

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

      allStepsRef.current = res.activeRoute.allSteps;
      activeRouteRef.current = res.activeRoute;

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

      // Load active route into kinematic driving simulator
      routeSimulator.loadRoute(res.activeRoute, currentCoords);
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
    arrivalAnnouncedRef.current = false;
    announcedMilestonesRef.current = {};

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

  // Multi-Stop: Reorder any stop across the entire itinerary
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
  const selectRoute = (index: number) => {
    if (!availableRoutes[index]) return;
    const targetRoute = availableRoutes[index];
    setSelectedRouteIndex(index);
    setActiveRoute(targetRoute);
    allStepsRef.current = targetRoute.allSteps;
    activeRouteRef.current = targetRoute;
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

    routeSimulator.loadRoute(targetRoute, vehicleCoords);
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
        allStepsRef.current = updated.allSteps;
        activeRouteRef.current = updated;

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
        announcedMilestonesRef.current = {};
        arrivalAnnouncedRef.current = false;

        // Re-announce the starting maneuver of the newly calculated path
        if (!isVoiceMuted && updated.primaryManeuver) {
          const spoken = formatSpokenInstruction(updated.primaryManeuver, updated.primaryManeuver.distanceStr);
          speakTurn(`Rerouting. ${spoken}`, 'high');
        }

        // Seamlessly reload simulator on the new rerouted path from current vehicle location while preserving driving speed!
        routeSimulator.loadRoute(updated, currentPos, true);
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

  // Continuous monitoring for Off-Route status during active navigation
  useEffect(() => {
    if (navStatus !== 'navigating' || !activeRoute?.rawGeometry?.coordinates) return;

    const routeCoords = activeRoute.rawGeometry.coordinates;

    const offRouteCheck = checkOffRouteStatus(vehicleCoords, routeCoords, 35);
    if (offRouteCheck.isOffRoute) {
      consecutiveOffRouteCountRef.current += 1;
      if (consecutiveOffRouteCountRef.current >= 2) {
        triggerAutoReroute(vehicleCoords);
      }
    } else {
      consecutiveOffRouteCountRef.current = 0;
    }
  }, [vehicleCoords[0], vehicleCoords[1], navStatus, activeRoute]);

  // Step 3: Start live 3D driver follow navigation
  const startNavigation = () => {
    setNavStatus('navigating');
    setInspectedStep(null);
    setActiveStepIndex(0);
    arrivalAnnouncedRef.current = false;
    announcedMilestonesRef.current = {};

    if (activeRoute) {
      allStepsRef.current = activeRoute.allSteps;
      activeRouteRef.current = activeRoute;
      setAllSteps(activeRoute.allSteps);
      setPrimaryManeuver(activeRoute.primaryManeuver);
      setUpcomingSteps(activeRoute.upcomingSteps);
      routeSimulator.loadRoute(activeRoute, vehicleCoords);
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

  // Interactive Step Inspector
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

  const openStreetView = () => {
    setIsStreetViewOpen(true);
  };

  const closeStreetView = () => {
    setIsStreetViewOpen(false);
  };

  const nextInspectedStep = () => {
    const list = allStepsRef.current;
    if (list.length === 0) return;
    const currentIdx = inspectedStep
      ? list.findIndex((s) => s.id === inspectedStep.id)
      : activeStepIndex;
    const nextIdx = Math.min(list.length - 1, (currentIdx >= 0 ? currentIdx : 0) + 1);
    const targetStep = list[nextIdx];
    if (targetStep) {
      inspectStep(targetStep);
    }
  };

  const prevInspectedStep = () => {
    const list = allStepsRef.current;
    if (list.length === 0) return;
    const currentIdx = inspectedStep
      ? list.findIndex((s) => s.id === inspectedStep.id)
      : activeStepIndex;
    const prevIdx = Math.max(0, (currentIdx >= 0 ? currentIdx : 0) - 1);
    const targetStep = list[prevIdx];
    if (targetStep) {
      inspectStep(targetStep);
    }
  };

  // Return from inspected step back to full route overview or driver follow
  const clearInspectedStep = () => {
    setIsStreetViewOpen(false);
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

  // Step Controls (Manual Stepping Fallback)
  const nextSimulationStep = () => {
    if (allSteps.length === 0) return;
    const nextIdx = Math.min(allSteps.length - 1, activeStepIndex + 1);
    routeSimulator.jumpBeforeStep(nextIdx, 50);
  };

  const prevSimulationStep = () => {
    if (allSteps.length === 0) return;
    const prevIdx = Math.max(0, activeStepIndex - 1);
    routeSimulator.jumpBeforeStep(prevIdx, 50);
  };

  // End or cancel navigation back to idle
  const endNavigation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopCurrentAudio();
    routeSimulator.emergencyStop();
    setDestination(null);
    setDestinationName('');
    setWaypoints([]);
    setNavStatus('idle');
    setActiveRoute(null);
    activeRouteRef.current = null;
    setAvailableRoutes([]);
    setSelectedRouteIndex(0);
    setPrimaryManeuver(null);
    setUpcomingSteps([]);
    setAllSteps([]);
    allStepsRef.current = [];
    setInspectedStep(null);
    setActiveStepIndex(0);
    setSimulatedCoords(null);
    setSimulatedHeading(0);
    setIsRerouting(false);
    consecutiveOffRouteCountRef.current = 0;
    isReroutingRef.current = false;
    arrivalAnnouncedRef.current = false;
    announcedMilestonesRef.current = {};

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

  const simulateOffRoute = () => {
    routeSimulator.takeWrongTurn(90);
  };

  const resetSimulatedPosition = () => {
    routeSimulator.snapBackToRoute();
  };

  // Option 3 Simulator Controls
  const setSimulatorThrottle = (val: number) => routeSimulator.setThrottle(val);
  const setSimulatorBrake = (val: number) => routeSimulator.setBrake(val);
  const setSimulatorSteering = (val: number) => {
    if (val < -0.3) {
      routeSimulator.steerDetour('left');
    } else if (val > 0.3) {
      routeSimulator.steerDetour('right');
    }
  };
  const setSimulatorReversing = (val: boolean) => routeSimulator.setReversing(val);
  const toggleSimulatorCruise = (targetKmh?: number) => routeSimulator.toggleCruise(targetKmh);
  const setSimulatorCruiseSpeed = (kmh: number) => routeSimulator.setCruiseSpeed(kmh);
  const toggleSimulatorFreeSteer = () => routeSimulator.setFreeSteering(!simTick.isFreeSteering);
  const snapSimulatorToRoute = () => routeSimulator.snapBackToRoute();
  const seekSimulatorPercent = (pct: number) => routeSimulator.seekPercent(pct);
  const jumpBeforeSimulatorStep = (stepIdx: number, metersBefore?: number) =>
    routeSimulator.jumpBeforeStep(stepIdx, metersBefore);
  const simulateWrongTurn = (angleDeg?: number) => routeSimulator.takeWrongTurn(angleDeg);
  const emergencyStopSimulator = () => routeSimulator.emergencyStop();

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
        speed: simTick.speedMps > 0.1 ? simTick.speedMps : position.speed,
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
        isStreetViewOpen,
        setIsStreetViewOpen,
        openStreetView,
        closeStreetView,
        nextInspectedStep,
        prevInspectedStep,
        activeStepIndex,
        nextSimulationStep,
        prevSimulationStep,
        previewRouteTo,
        startNavigation,
        endNavigation,
        recenterMap,

        // Off-route rerouting & testing
        isRerouting,
        simulateOffRoute,
        resetSimulatedPosition,

        // Voice Guidance
        isVoiceMuted,
        toggleVoiceMute,
        speakTurn,

        // Option 3 Simulator
        simSpeedKmh: simTick.speedKmh,
        simThrottle: simTick.throttle,
        simBrake: simTick.brake,
        simIsCruising: simTick.isCruising,
        simCruiseSpeedKmh: simTick.targetCruiseSpeedKmh,
        simIsFreeSteering: simTick.isFreeSteering,
        simProgressRatio: simTick.progressRatio,
        simDistanceAlongRoute: simTick.distanceAlongRoute,
        simTotalDistance: simTick.totalDistanceMeters,
        simDistanceToNextManeuver: simTick.distanceToNextManeuver,
        simIsReversing: simTick.isReversing,
        setSimulatorThrottle,
        setSimulatorBrake,
        setSimulatorSteering,
        setSimulatorReversing,
        toggleSimulatorCruise,
        setSimulatorCruiseSpeed,
        toggleSimulatorFreeSteer,
        snapSimulatorToRoute,
        seekSimulatorPercent,
        jumpBeforeSimulatorStep,
        simulateWrongTurn,
        emergencyStopSimulator,
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
