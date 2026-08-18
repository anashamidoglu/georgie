import React from 'react';
import { ArrowUp, CornerUpRight, MapPin } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';

interface ManeuverStep {
  distance: string;
  road: string;
  icon: 'straight' | 'right' | 'destination';
}

export const UpcomingManeuversCard: React.FC = () => {
  const steps: ManeuverStep[] = [
    { distance: '4.2 km', road: 'Continue on Sheikh Zayed Rd (E11)', icon: 'straight' },
    { distance: '11.8 km', road: 'Take Exit 29 for Financial Centre', icon: 'right' },
    { distance: '14.5 km', road: 'Arrive at Downtown Dubai', icon: 'destination' },
  ];

  return (
    <LiquidGlassCard
      padding="md"
      className="w-full h-full flex flex-col justify-between select-none font-sf"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 px-1">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Upcoming Maneuvers
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-around py-1 space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
              {step.icon === 'straight' && <ArrowUp className="w-4 h-4 text-white/80" />}
              {step.icon === 'right' && <CornerUpRight className="w-4 h-4 text-white/80" />}
              {step.icon === 'destination' && <MapPin className="w-4 h-4 text-emerald-400" />}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold font-sf-display tabular-nums text-white/90">
                In {step.distance}
              </span>
              <span className="text-xs font-normal text-white/50 truncate">
                {step.road}
              </span>
            </div>
          </div>
        ))}
      </div>
    </LiquidGlassCard>
  );
};
