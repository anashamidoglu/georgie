import React, { useEffect, useState } from 'react';
import { AlertTriangle, Construction, X, Flame, ShieldAlert } from 'lucide-react';
import type { TrafficIncident } from '../../services/incidentService';

interface IncidentAlertBannerProps {
  incident: TrafficIncident;
  onDismiss: () => void;
  autoDismissSeconds?: number;
}

export const IncidentAlertBanner: React.FC<IncidentAlertBannerProps> = ({
  incident,
  onDismiss,
  autoDismissSeconds = 8,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const durationMs = autoDismissSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [incident.id, autoDismissSeconds, onDismiss]);

  const getIncidentIcon = () => {
    switch (incident.type) {
      case 'accident':
        return (
          <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        );
      case 'roadwork':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Construction className="w-4 h-4" />
          </div>
        );
      case 'closure':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
    }
  };

  const distanceStr =
    incident.distanceAheadMeters !== undefined
      ? incident.distanceAheadMeters >= 1000
        ? `In ${(incident.distanceAheadMeters / 1000).toFixed(1)} km`
        : `In ${incident.distanceAheadMeters} m`
      : 'Ahead on route';

  const delayStr =
    incident.delaySeconds > 0
      ? `+${Math.round(incident.delaySeconds / 60)} min delay`
      : 'Caution';

  return (
    <div className="w-full max-w-[420px] rounded-2xl bg-black/95 border border-white/20 shadow-2xl backdrop-blur-md overflow-hidden select-none font-sf pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-3.5 flex items-center justify-between space-x-3">
        {/* Incident Icon */}
        {getIncidentIcon()}

        {/* Details */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white tracking-tight leading-snug">
              {incident.title}
            </span>
            <span className="text-[11px] font-semibold text-white/50 tabular-nums">
              • {distanceStr}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-xs font-semibold text-amber-400 tabular-nums">
              {delayStr}
            </span>
            <span className="text-[11px] text-white/60 truncate font-medium">
              {incident.description}
            </span>
          </div>
        </div>

        {/* Manual Dismiss [X] */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Dismiss Alert"
          title="Dismiss Alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar (Google Maps style countdown) */}
      <div className="w-full h-0.5 bg-white/10 overflow-hidden">
        <div
          className="h-full bg-amber-400/80 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
