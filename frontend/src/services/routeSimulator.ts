/**
 * Georgie Carputer - Dev-Mode Route & Vehicle Kinematics Simulator (Option 3 Hybrid)
 * Supports realistic driver acceleration, braking, cruise control, polyline tracking,
 * and breakaway free-steering for comprehensive turn-by-turn nav testing.
 */

import type { RouteResult, ManeuverInfo } from './navService';

export interface SimulatorTick {
  coords: [number, number];
  heading: number;
  speedKmh: number;
  speedMps: number;
  distanceAlongRoute: number;
  totalDistanceMeters: number;
  progressRatio: number;
  isFreeSteering: boolean;
  isCruising: boolean;
  targetCruiseSpeedKmh: number;
  throttle: number;
  brake: number;
  isReversing: boolean;
  activeStepIndex: number;
  distanceToNextManeuver: number;
  isFinished: boolean;
}

export type SimulatorListener = (tick: SimulatorTick) => void;

function haversineDist(c1: [number, number], c2: [number, number]): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (c2[1] - c1[1]) * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1[1] * rad) * Math.cos(c2[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

export class RouteKinematicsEngine {
  private listeners: Set<SimulatorListener> = new Set();
  private polyline: [number, number][] = [];
  private cumulativeDistances: number[] = [];
  private stepCumulativeDistances: number[] = [];
  private allSteps: ManeuverInfo[] = [];

  // Vehicle Kinematic State
  private coords: [number, number] = [55.2708, 25.2048];
  private heading: number = 0;
  private speedMps: number = 0; // meters per second
  private maxSpeedMps: number = (140 * 1000) / 3600; // max 140 km/h
  private accelerationRate: number = 7.0; // m/s^2 when holding gas
  private brakingRate: number = 16.0; // m/s^2 when braking
  private naturalDrag: number = 1.8; // m/s^2 natural coasting slowdown
  private steerRateDegPerSec: number = 65; // steering rotation speed

  // Driver Controls
  private throttleInput: number = 0; // 0 to 1
  private brakeInput: number = 0; // 0 to 1
  private steerInput: number = 0; // -1 (left) to +1 (right)
  private isReversing: boolean = false;
  private isCruising: boolean = false;
  private targetCruiseSpeedKmh: number = 60;
  private isFreeSteering: boolean = false;

  // Route Progress
  private distanceAlongRoute: number = 0;
  private totalDistanceMeters: number = 0;

  // Animation Loop
  private animationFrameId: number | null = null;
  private lastTickTime: number = 0;

  constructor() {
    this.startLoop = this.startLoop.bind(this);
    this.tick = this.tick.bind(this);
  }

  public subscribe(listener: SimulatorListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public loadRoute(route: RouteResult, initialCoords?: [number, number]) {
    this.allSteps = route.allSteps || [];
    this.polyline = route.rawGeometry?.coordinates || [];
    this.totalDistanceMeters = route.totalDistanceMeters || 0;

    // Calculate segment cumulative distances
    this.cumulativeDistances = [0];
    let total = 0;
    for (let i = 0; i < this.polyline.length - 1; i++) {
      const dist = haversineDist(this.polyline[i], this.polyline[i + 1]);
      total += dist;
      this.cumulativeDistances.push(total);
    }
    this.totalDistanceMeters = total;

    // Map each step's location to cumulative distance along the polyline
    this.stepCumulativeDistances = this.allSteps.map((step) => {
      if (!step.location) return 0;
      let closestDist = 0;
      let minDeviation = Infinity;
      for (let i = 0; i < this.polyline.length; i++) {
        const d = haversineDist(step.location, this.polyline[i]);
        if (d < minDeviation) {
          minDeviation = d;
          closestDist = this.cumulativeDistances[i];
        }
      }
      return closestDist;
    });

    this.distanceAlongRoute = 0;
    this.isFreeSteering = false;
    this.speedMps = 0;

    if (this.polyline.length > 0) {
      this.coords = initialCoords || this.polyline[0];
      if (this.polyline.length > 1) {
        this.heading = calculateBearing(this.polyline[0], this.polyline[1]);
      }
    }

    this.startLoop();
    this.notify();
  }

  public setThrottle(val: number) {
    this.throttleInput = Math.max(0, Math.min(1, val));
  }

  public setBrake(val: number) {
    this.brakeInput = Math.max(0, Math.min(1, val));
    if (this.brakeInput > 0 && this.isCruising) {
      // Tapping brake disengages cruise control like a real car
      this.isCruising = false;
    }
  }

  public setSteering(val: number) {
    this.steerInput = Math.max(-1, Math.min(1, val));
    if (Math.abs(this.steerInput) > 0.3 && !this.isFreeSteering) {
      // Active manual steering breaks out of route lock
      this.isFreeSteering = true;
    }
  }

  public setReversing(reversing: boolean) {
    this.isReversing = reversing;
  }

  public toggleCruise(targetKmh?: number) {
    this.isCruising = !this.isCruising;
    if (this.isCruising) {
      if (targetKmh) {
        this.targetCruiseSpeedKmh = targetKmh;
      } else if (this.speedMps > 3) {
        // Set cruise to current speed
        this.targetCruiseSpeedKmh = Math.round((this.speedMps * 3600) / 1000);
      } else {
        this.targetCruiseSpeedKmh = 60;
      }
    }
    this.notify();
  }

  public setCruiseSpeed(kmh: number) {
    this.targetCruiseSpeedKmh = Math.max(10, Math.min(160, kmh));
    if (!this.isCruising) {
      this.isCruising = true;
    }
    this.notify();
  }

  public setFreeSteering(free: boolean) {
    this.isFreeSteering = free;
    this.notify();
  }

  public snapBackToRoute() {
    if (this.polyline.length === 0) return;
    // Find closest vertex on the polyline
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.polyline.length; i++) {
      const d = haversineDist(this.coords, this.polyline[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    this.distanceAlongRoute = this.cumulativeDistances[bestIdx] || 0;
    this.coords = this.polyline[bestIdx];
    this.isFreeSteering = false;

    if (bestIdx < this.polyline.length - 1) {
      this.heading = calculateBearing(this.polyline[bestIdx], this.polyline[bestIdx + 1]);
    }
    this.notify();
  }

  public seekDistance(meters: number) {
    this.distanceAlongRoute = Math.max(0, Math.min(this.totalDistanceMeters, meters));
    this.isFreeSteering = false;
    this.updatePositionFromRouteDistance();
    this.notify();
  }

  public seekPercent(percent: number) {
    const targetMeters = (Math.max(0, Math.min(100, percent)) / 100) * this.totalDistanceMeters;
    this.seekDistance(targetMeters);
  }

  public jumpBeforeStep(stepIndex: number, metersBefore: number = 100) {
    if (stepIndex < 0 || stepIndex >= this.allSteps.length) return;
    const stepTargetDist = this.stepCumulativeDistances[stepIndex] || 0;
    const seekTo = Math.max(0, stepTargetDist - metersBefore);
    this.seekDistance(seekTo);
  }

  public takeWrongTurn(angleDeg: number = 85) {
    this.isFreeSteering = true;
    this.heading = (this.heading + angleDeg + 360) % 360;
    if (this.speedMps < 5) {
      this.speedMps = (45 * 1000) / 3600; // Give it 45 km/h push down the wrong road
    }
    this.notify();
  }

  public emergencyStop() {
    this.speedMps = 0;
    this.throttleInput = 0;
    this.brakeInput = 0;
    this.isCruising = false;
    this.notify();
  }

  private startLoop() {
    if (this.animationFrameId !== null) return;
    this.lastTickTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick(now: number) {
    const dt = Math.min(0.1, (now - this.lastTickTime) / 1000); // delta time in seconds, max 100ms cap
    this.lastTickTime = now;

    this.updatePhysics(dt);

    if (this.listeners.size > 0) {
      this.notify();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  private updatePhysics(dt: number) {
    // 1. Cruise Control Speed Management
    if (this.isCruising) {
      const targetMps = (this.targetCruiseSpeedKmh * 1000) / 3600;
      if (this.speedMps < targetMps - 0.2) {
        this.speedMps = Math.min(targetMps, this.speedMps + this.accelerationRate * 0.75 * dt);
      } else if (this.speedMps > targetMps + 0.5) {
        this.speedMps = Math.max(targetMps, this.speedMps - this.naturalDrag * 2.0 * dt);
      }
    } else {
      // 2. Manual Throttle & Braking
      if (this.brakeInput > 0) {
        this.speedMps = Math.max(0, this.speedMps - this.brakingRate * this.brakeInput * dt);
      } else if (this.throttleInput > 0) {
        this.speedMps = Math.min(
          this.maxSpeedMps,
          this.speedMps + this.accelerationRate * this.throttleInput * dt
        );
      } else {
        // Natural coasting deceleration
        this.speedMps = Math.max(0, this.speedMps - this.naturalDrag * dt);
      }
    }

    const effectiveMps = this.isReversing ? -this.speedMps : this.speedMps;
    const distanceDelta = effectiveMps * dt;

    if (distanceDelta === 0 && this.steerInput === 0) return;

    // 3. Movement Execution
    if (!this.isFreeSteering && this.polyline.length > 1) {
      // Route Constrained Mode
      this.distanceAlongRoute = Math.max(
        0,
        Math.min(this.totalDistanceMeters, this.distanceAlongRoute + distanceDelta)
      );
      this.updatePositionFromRouteDistance();
    } else {
      // Free Steer / Breakaway Mode
      if (this.steerInput !== 0) {
        // Turn rate scales slightly with speed for natural handling
        const speedFactor = Math.min(1.5, Math.max(0.4, this.speedMps / 15));
        this.heading =
          (this.heading + this.steerInput * this.steerRateDegPerSec * speedFactor * dt + 360) %
          360;
      }

      if (distanceDelta !== 0) {
        const headingRad = this.heading * (Math.PI / 180);
        const dLat = (distanceDelta * Math.cos(headingRad)) / 111320;
        const dLng =
          (distanceDelta * Math.sin(headingRad)) /
          (111320 * Math.cos(this.coords[1] * (Math.PI / 180)));
        this.coords = [this.coords[0] + dLng, this.coords[1] + dLat];
      }
    }
  }

  private updatePositionFromRouteDistance() {
    if (this.polyline.length < 2) return;

    const d = this.distanceAlongRoute;

    // Find the segment
    let segIdx = 0;
    while (
      segIdx < this.cumulativeDistances.length - 1 &&
      this.cumulativeDistances[segIdx + 1] < d
    ) {
      segIdx++;
    }

    const segStartDist = this.cumulativeDistances[segIdx] || 0;
    const segEndDist = this.cumulativeDistances[segIdx + 1] || segStartDist + 0.1;
    const segLen = segEndDist - segStartDist;
    const t = segLen > 0 ? Math.max(0, Math.min(1, (d - segStartDist) / segLen)) : 0;

    const p1 = this.polyline[segIdx];
    const p2 = this.polyline[segIdx + 1] || p1;

    // Interpolate coords
    this.coords = [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];

    // Bearing of current segment
    this.heading = calculateBearing(p1, p2);
  }

  private getActiveStepIndex(): number {
    if (this.stepCumulativeDistances.length === 0) return 0;
    const currentDist = this.distanceAlongRoute;
    for (let i = 0; i < this.stepCumulativeDistances.length; i++) {
      if (currentDist < this.stepCumulativeDistances[i] - 15) {
        return i;
      }
    }
    return Math.max(0, this.stepCumulativeDistances.length - 1);
  }

  private getDistanceToNextManeuver(): number {
    const activeIdx = this.getActiveStepIndex();
    const nextStepDist = this.stepCumulativeDistances[activeIdx] ?? this.totalDistanceMeters;
    return Math.max(0, nextStepDist - this.distanceAlongRoute);
  }

  public getSnapshot(): SimulatorTick {
    const speedKmh = Math.round((this.speedMps * 3600) / 1000);
    const progressRatio =
      this.totalDistanceMeters > 0 ? this.distanceAlongRoute / this.totalDistanceMeters : 0;
    const isFinished =
      this.totalDistanceMeters > 0 &&
      this.distanceAlongRoute >= this.totalDistanceMeters - 5 &&
      !this.isFreeSteering;

    return {
      coords: this.coords,
      heading: this.heading,
      speedKmh,
      speedMps: this.speedMps,
      distanceAlongRoute: Math.round(this.distanceAlongRoute),
      totalDistanceMeters: Math.round(this.totalDistanceMeters),
      progressRatio,
      isFreeSteering: this.isFreeSteering,
      isCruising: this.isCruising,
      targetCruiseSpeedKmh: this.targetCruiseSpeedKmh,
      throttle: this.throttleInput,
      brake: this.brakeInput,
      isReversing: this.isReversing,
      activeStepIndex: this.getActiveStepIndex(),
      distanceToNextManeuver: Math.round(this.getDistanceToNextManeuver()),
      isFinished,
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

export const routeSimulator = new RouteKinematicsEngine();
