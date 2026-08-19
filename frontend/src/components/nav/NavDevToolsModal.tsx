import React from 'react';
import {
  X,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  Flame,
  Construction,
  ShieldAlert,
  AlertTriangle,
  Radio,
  MapPin,
  Compass,
} from 'lucide-react';
import { useNav } from '../../context/NavContext';
import { useMedia } from '../../context/MediaContext';

interface NavDevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavDevToolsModal: React.FC<NavDevToolsModalProps> = ({ isOpen, onClose }) => {
  const {
    navStatus,
    previewRouteTo,
    startNavigation,
    endNavigation,
    allSteps,
    activeStepIndex,
    nextSimulationStep,
    prevSimulationStep,
    simulateOffRouteDeviation,
    injectCustomIncident,
    clearAllIncidents,
    isRerouting,
    incidents,
  } = useNav();

  const { hasActiveMedia, setHasActiveMedia } = useMedia();

  if (!isOpen) return null;

  const PRESETS: { label: string; coords: [number, number]; desc: string }[] = [
    { label: 'Dubai Mall', coords: [55.2785, 25.1972], desc: 'E11 Falcon → D71 Fort + Exit 50' },
    { label: 'MCC', coords: [55.4077, 25.2155], desc: 'S108 → E11 → D89' },
    { label: 'UOS Medical', coords: [55.4855, 25.2917], desc: 'Sharjah University Corridor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sf select-none animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-[#12131a] border border-white/20 shadow-2xl p-6 flex flex-col space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Navigation & Route Dev Tools</h2>
              <p className="text-xs text-white/50">Simulate driving, missed turns, and traffic incidents</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Quick Route Launchers */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            1. Quick Route Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  previewRouteTo(p.coords, p.label);
                }}
                className="flex flex-col text-left p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all group"
              >
                <div className="flex items-center space-x-1.5 text-sky-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold text-white group-hover:text-sky-300">
                    {p.label}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 mt-1 line-clamp-1">
                  {p.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Navigation Mode & Step Progression */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              2. Driving Simulation & Steps
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
              Status: <span className="text-sky-400 font-bold uppercase">{navStatus}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {navStatus !== 'navigating' ? (
              <button
                type="button"
                disabled={navStatus === 'idle'}
                onClick={startNavigation}
                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-black font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Start Active Nav</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={endNavigation}
                className="flex-1 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>End Navigation</span>
              </button>
            )}

            {/* Turn Step Stepper */}
            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={prevSimulationStep}
                disabled={activeStepIndex <= 0 || allSteps.length === 0}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white"
                title="Previous Turn"
              >
                <StepBack className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono font-bold tabular-nums text-sky-300">
                {allSteps.length > 0 ? `${activeStepIndex + 1}/${allSteps.length}` : '0/0'}
              </span>
              <button
                type="button"
                onClick={nextSimulationStep}
                disabled={activeStepIndex >= allSteps.length - 1 || allSteps.length === 0}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white"
                title="Next Turn"
              >
                <StepForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Off-Route Missed Turn Reroute Trigger */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            3. Dynamic Off-Route / Missed Turn Test
          </span>
          <button
            type="button"
            onClick={simulateOffRouteDeviation}
            disabled={navStatus !== 'navigating'}
            className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 disabled:opacity-30 font-bold text-xs flex items-center justify-between transition-all"
          >
            <div className="flex items-center space-x-2">
              <RotateCcw className={`w-4 h-4 ${isRerouting ? 'animate-spin' : ''}`} />
              <span>Simulate Missed Turn (Deviate 60m Off Route)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-200">
              Triggers Auto-Reroute
            </span>
          </button>
        </div>

        {/* 4. Real-Time Incident Injector (Phase 3.5) */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              4. Inject Traffic Incident Ahead (8s Auto-Dismiss Alert)
            </span>
            {incidents.length > 0 && (
              <button
                type="button"
                onClick={clearAllIncidents}
                className="text-[10px] text-white/50 hover:text-white underline"
              >
                Clear Incidents
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => injectCustomIncident('accident')}
              disabled={navStatus !== 'navigating'}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 disabled:opacity-30 font-semibold text-xs flex flex-col items-center space-y-1 transition-colors"
            >
              <Flame className="w-4 h-4 text-red-400" />
              <span>Accident</span>
            </button>

            <button
              type="button"
              onClick={() => injectCustomIncident('roadwork')}
              disabled={navStatus !== 'navigating'}
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 disabled:opacity-30 font-semibold text-xs flex flex-col items-center space-y-1 transition-colors"
            >
              <Construction className="w-4 h-4 text-amber-400" />
              <span>Roadwork</span>
            </button>

            <button
              type="button"
              onClick={() => injectCustomIncident('closure')}
              disabled={navStatus !== 'navigating'}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 disabled:opacity-30 font-semibold text-xs flex flex-col items-center space-y-1 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Closure</span>
            </button>

            <button
              type="button"
              onClick={() => injectCustomIncident('hazard')}
              disabled={navStatus !== 'navigating'}
              className="p-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 disabled:opacity-30 font-semibold text-xs flex flex-col items-center space-y-1 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span>Hazard</span>
            </button>
          </div>
        </div>

        {/* 5. Media Toggle */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-white/50" />
            <span className="text-xs text-white/70">Media Player Simulation</span>
          </div>
          <button
            type="button"
            onClick={() => setHasActiveMedia(!hasActiveMedia)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              hasActiveMedia
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            Media: {hasActiveMedia ? 'Active' : 'Muted'}
          </button>
        </div>
      </div>
    </div>
  );
};
