import React, { useState, useEffect } from 'react';
import {
  Compass,
  RotateCcw,
  Navigation2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  FastForward,
  Sliders,
} from 'lucide-react';
import { useNav } from '../../context/NavContext';

export const DevDrivingSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const {
    activeRoute,
    activeStepIndex,
    vehicleCoords,
    vehicleHeading,
    speed,
    // Simulator states and actions from NavContext
    simSpeedKmh,
    simThrottle,
    simBrake,
    simIsCruising,
    simCruiseSpeedKmh,
    simIsFreeSteering,
    simProgressRatio,
    simDistanceAlongRoute,
    simTotalDistance,
    simDistanceToNextManeuver,
    simIsReversing,
    setSimulatorThrottle,
    setSimulatorBrake,
    setSimulatorSteering,
    setSimulatorReversing,
    toggleSimulatorCruise,
    setSimulatorCruiseSpeed,
    snapSimulatorToRoute,
    seekSimulatorPercent,
    jumpBeforeSimulatorStep,
    simulateWrongTurn,
    emergencyStopSimulator,
  } = useNav();

  // Active keyboard pedal states for visual feedback
  const [isGasPressed, setIsGasPressed] = useState<boolean>(false);
  const [isBrakePressed, setIsBrakePressed] = useState<boolean>(false);
  const [isSteerLeftPressed, setIsSteerLeftPressed] = useState<boolean>(false);
  const [isSteerRightPressed, setIsSteerRightPressed] = useState<boolean>(false);

  // Global Keyboard Controls (W/A/S/D, Arrows, Space, C, R, 1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a search or text input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!e.repeat) {
          setIsGasPressed(true);
          setSimulatorThrottle(1);
        }
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (!e.repeat) {
          setIsBrakePressed(true);
          setSimulatorBrake(1);
        }
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (!e.repeat) {
          setIsSteerLeftPressed(true);
          setSimulatorSteering(-1);
        }
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (!e.repeat) {
          setIsSteerRightPressed(true);
          setSimulatorSteering(1);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        emergencyStopSimulator();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        toggleSimulatorCruise();
      } else if (e.code === 'KeyR') {
        if (!e.repeat) {
          setSimulatorReversing(!simIsReversing);
        }
      } else if (e.code === 'Digit1') {
        setSimulatorCruiseSpeed(30);
      } else if (e.code === 'Digit2') {
        setSimulatorCruiseSpeed(60);
      } else if (e.code === 'Digit3') {
        setSimulatorCruiseSpeed(100);
      } else if (e.code === 'Digit4') {
        setSimulatorCruiseSpeed(140);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIsGasPressed(false);
        setSimulatorThrottle(0);
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        setIsBrakePressed(false);
        setSimulatorBrake(0);
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        setIsSteerLeftPressed(false);
        setSimulatorSteering(0);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        setIsSteerRightPressed(false);
        setSimulatorSteering(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [simIsReversing, setSimulatorThrottle, setSimulatorBrake, setSimulatorSteering, setSimulatorReversing, toggleSimulatorCruise, setSimulatorCruiseSpeed, emergencyStopSimulator]);

  const displaySpeed = Math.round(speed || simSpeedKmh || 0);

  return (
    <aside
      className={`fixed top-0 right-0 h-screen z-50 transition-all duration-300 ease-in-out font-sf select-none flex items-stretch ${
        isOpen ? 'w-84 2xl:w-96' : 'w-12'
      }`}
    >
      {/* Sidebar Edge Toggle Tab */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-full bg-[#08090d]/90 hover:bg-[#10121a] border-l border-white/10 text-white/60 hover:text-white flex flex-col items-center justify-between py-6 transition-colors shadow-2xl"
        title={isOpen ? 'Collapse Dev Driving Deck' : 'Expand Dev Driving Deck'}
      >
        <div className="flex flex-col items-center space-y-2">
          <Sliders className="w-5 h-5 text-sky-400" />
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wider uppercase text-white/50">
            DEV DRIVER DECK
          </span>
        </div>

        <div className="flex flex-col items-center space-y-3">
          <div
            className={`w-3 h-3 rounded-full animate-pulse ${
              simIsFreeSteering
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : simIsCruising
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
            }`}
          />
          {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </div>
      </button>

      {/* Main Sidebar Content Area (Off-screen from carputer 1024x600 viewport) */}
      {isOpen && (
        <div className="flex-1 h-full bg-[#0b0d13]/95 backdrop-blur-2xl border-l border-white/10 p-4.5 flex flex-col space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shadow-md">
                <Navigation2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Driver Simulator</h2>
                <p className="text-[11px] font-medium text-white/40">Kinematic GPS Telemetry</p>
              </div>
            </div>

            {/* Mode Badge */}
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                simIsFreeSteering
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : simIsCruising
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              }`}
            >
              {simIsFreeSteering ? 'Free Steer' : simIsCruising ? 'Cruise' : 'Route Lock'}
            </span>
          </div>

          {/* Speedometer & Live Telemetry Gauge */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-inner">
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-4xl font-extrabold font-din tabular-nums text-white tracking-tight leading-none">
                  {displaySpeed}
                </span>
                <span className="text-xs font-bold text-white/50 uppercase">km/h</span>
              </div>
              <span className="text-[11px] text-white/40 font-mono mt-1">
                Heading: {Math.round(vehicleHeading || 0)}°
              </span>
            </div>

            <div className="flex flex-col items-end space-y-1.5 text-right">
              <div className="flex items-center space-x-1.5 text-[11px] text-white/60">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono">
                  {vehicleCoords[1]?.toFixed(4)}, {vehicleCoords[0]?.toFixed(4)}
                </span>
              </div>
              <div className="text-[11px] text-white/40 font-mono">
                Next Turn: {simDistanceToNextManeuver}m
              </div>
            </div>
          </div>

          {/* Interactive Gas & Brake Pedals (Touch + Mouse Click/Hold) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Brake Pedal */}
            <button
              type="button"
              onMouseDown={() => {
                setIsBrakePressed(true);
                setSimulatorBrake(1);
              }}
              onMouseUp={() => {
                setIsBrakePressed(false);
                setSimulatorBrake(0);
              }}
              onMouseLeave={() => {
                setIsBrakePressed(false);
                setSimulatorBrake(0);
              }}
              onTouchStart={() => {
                setIsBrakePressed(true);
                setSimulatorBrake(1);
              }}
              onTouchEnd={() => {
                setIsBrakePressed(false);
                setSimulatorBrake(0);
              }}
              className={`h-24 rounded-2xl border flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 shadow-xl ${
                isBrakePressed || simBrake > 0
                  ? 'bg-rose-500/30 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white/80'
              }`}
            >
              <span className="text-base font-bold uppercase tracking-wider">Brake</span>
              <span className="text-[10px] text-white/40 font-mono">[S / ↓]</span>
            </button>

            {/* Gas / Throttle Pedal */}
            <button
              type="button"
              onMouseDown={() => {
                setIsGasPressed(true);
                setSimulatorThrottle(1);
              }}
              onMouseUp={() => {
                setIsGasPressed(false);
                setSimulatorThrottle(0);
              }}
              onMouseLeave={() => {
                setIsGasPressed(false);
                setSimulatorThrottle(0);
              }}
              onTouchStart={() => {
                setIsGasPressed(true);
                setSimulatorThrottle(1);
              }}
              onTouchEnd={() => {
                setIsGasPressed(false);
                setSimulatorThrottle(0);
              }}
              className={`h-24 rounded-2xl border flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 shadow-xl ${
                isGasPressed || simThrottle > 0
                  ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white/80'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-bold uppercase tracking-wider">Gas</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">[W / ↑]</span>
            </button>
          </div>

          {/* Steering Controls (for Free-Roam Breakaway) */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="font-bold">Manual Steering / Detour</span>
              <span className="text-[10px] font-mono text-white/40">[A / D or ← / →]</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onMouseDown={() => {
                  setIsSteerLeftPressed(true);
                  setSimulatorSteering(-1);
                }}
                onMouseUp={() => {
                  setIsSteerLeftPressed(false);
                  setSimulatorSteering(0);
                }}
                onMouseLeave={() => {
                  setIsSteerLeftPressed(false);
                  setSimulatorSteering(0);
                }}
                onTouchStart={() => {
                  setIsSteerLeftPressed(true);
                  setSimulatorSteering(-1);
                }}
                onTouchEnd={() => {
                  setIsSteerLeftPressed(false);
                  setSimulatorSteering(0);
                }}
                className={`py-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all active:scale-95 ${
                  isSteerLeftPressed
                    ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Steer Left</span>
              </button>

              <button
                type="button"
                onMouseDown={() => {
                  setIsSteerRightPressed(true);
                  setSimulatorSteering(1);
                }}
                onMouseUp={() => {
                  setIsSteerRightPressed(false);
                  setSimulatorSteering(0);
                }}
                onMouseLeave={() => {
                  setIsSteerRightPressed(false);
                  setSimulatorSteering(0);
                }}
                onTouchStart={() => {
                  setIsSteerRightPressed(true);
                  setSimulatorSteering(1);
                }}
                onTouchEnd={() => {
                  setIsSteerRightPressed(false);
                  setSimulatorSteering(0);
                }}
                className={`py-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all active:scale-95 ${
                  isSteerRightPressed
                    ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white'
                }`}
              >
                <span>Steer Right</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cruise Control & Speed Presets */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/70">Cruise Control</span>
              <button
                type="button"
                onClick={() => toggleSimulatorCruise()}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  simIsCruising
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-white/[0.05] border-white/15 text-white/60 hover:text-white'
                }`}
              >
                {simIsCruising ? `Cruising @ ${simCruiseSpeedKmh} km/h` : 'Engage Cruise [C]'}
              </button>
            </div>

            {/* Quick Speed Presets [1-4] */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '30 [1]', kmh: 30 },
                { label: '60 [2]', kmh: 60 },
                { label: '100 [3]', kmh: 100 },
                { label: '140 [4]', kmh: 140 },
              ].map((p) => (
                <button
                  key={p.kmh}
                  type="button"
                  onClick={() => setSimulatorCruiseSpeed(p.kmh)}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold font-mono transition-all active:scale-90 ${
                    simIsCruising && simCruiseSpeedKmh === p.kmh
                      ? 'bg-emerald-500 border-emerald-400 text-black font-black'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Route Maneuver Jump Shortcuts */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col space-y-2">
            <span className="text-xs font-bold text-white/70">Maneuver Validation Shortcuts</span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => jumpBeforeSimulatorStep(activeStepIndex, 100)}
                className="py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-sky-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                title="Jump vehicle 100m before the next maneuver to test turn banner and voice prompt"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>100m Pre-Turn</span>
              </button>

              <button
                type="button"
                onClick={() => simulateWrongTurn(90)}
                className="py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                title="Diverge vehicle 90m down wrong street to test dynamic off-route recalculation"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Wrong Turn</span>
              </button>
            </div>

            {simIsFreeSteering && (
              <button
                type="button"
                onClick={snapSimulatorToRoute}
                className="w-full py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 mt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Snap Back to Route</span>
              </button>
            )}
          </div>

          {/* Timeline Route Scrubber */}
          {activeRoute && (
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white/70">Route Progress</span>
                <span className="font-mono text-white/50">
                  {Math.round((simProgressRatio || 0) * 100)}% ({simDistanceAlongRoute}m /{' '}
                  {simTotalDistance}m)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((simProgressRatio || 0) * 100)}
                onChange={(e) => seekSimulatorPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          )}

          {/* Emergency Handbrake & Stop Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={emergencyStopSimulator}
              className="w-full py-3 rounded-2xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/60 text-rose-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Emergency Handbrake [Space]</span>
            </button>
          </div>

          {/* Keyboard Legend Helper */}
          <div className="mt-auto pt-3 border-t border-white/10 text-[10px] text-white/40 space-y-1 font-mono">
            <p className="font-bold text-white/60">Keyboard Shortcuts:</p>
            <p>• [W/↑]: Gas | [S/↓]: Brake</p>
            <p>• [A/D / ←/→]: Steer Left / Right</p>
            <p>• [C]: Cruise Toggle | [1-4]: 30/60/100/140 km/h</p>
            <p>• [Space]: Stop | [R]: Reverse</p>
          </div>
        </div>
      )}
    </aside>
  );
};
