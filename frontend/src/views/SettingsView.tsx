import React, { useState } from 'react';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Sun, Moon, Bluetooth, Power, Volume2, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  onBackToDash?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToDash }) => {
  const [themeMode, setThemeMode] = useState<'night' | 'day'>('night');
  const [gainLevel, setGainLevel] = useState<number>(75);
  const [isShuttingDown, setIsShuttingDown] = useState<boolean>(false);

  const handleShutdown = () => {
    setIsShuttingDown(true);
    setTimeout(() => {
      alert('System checkpoint saved. Ready for ignition off.');
      setIsShuttingDown(false);
    }, 2000);
  };

  return (
    <div className="w-full h-full p-5 overflow-y-auto select-none space-y-4 font-sf">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-lg font-semibold tracking-tight text-white">
          Settings
        </span>

        <button
          type="button"
          onClick={onBackToDash}
          className="glass-btn px-4 py-1.5 text-xs font-semibold text-white"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {/* Day / Night Theming */}
        <LiquidGlassCard padding="md" className="space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">Theme Contrast</span>
          </div>
          <p className="text-xs text-white/50">
            Adjust surface contrast multipliers for daylight glare reduction.
          </p>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setThemeMode('night');
                document.documentElement.removeAttribute('data-theme');
              }}
              className={`flex-1 glass-btn py-2 text-xs font-semibold space-x-2 ${
                themeMode === 'night' ? 'bg-white/20 text-white' : 'text-white/40'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Night Base</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeMode('day');
                document.documentElement.setAttribute('data-theme', 'day');
              }}
              className={`flex-1 glass-btn py-2 text-xs font-semibold space-x-2 ${
                themeMode === 'day' ? 'bg-white/20 text-white' : 'text-white/40'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Day Contrast</span>
            </button>
          </div>
        </LiquidGlassCard>

        {/* Audio Ducking & Calibration */}
        <LiquidGlassCard padding="md" className="space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Audio Output Calibration</span>
          </div>
          <p className="text-xs text-white/50">
            Pi line-out calibration for cassette deck headroom.
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={gainLevel}
              onChange={(e) => setGainLevel(Number(e.target.value))}
              className="flex-1 accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-sf-display font-bold text-white/80 tabular-nums w-8">
              {gainLevel}%
            </span>
          </div>
        </LiquidGlassCard>

        {/* Bluetooth Device Management */}
        <LiquidGlassCard padding="md" className="space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <Bluetooth className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold">Bluetooth Connection</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white">iPhone</span>
              <span className="text-[11px] text-emerald-400">Hands-Free & Audio</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Connected
            </span>
          </div>
        </LiquidGlassCard>

        {/* Power & Safe Shutdown */}
        <LiquidGlassCard padding="md" className="space-y-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <Power className="w-4 h-4" />
            <span className="text-sm font-semibold">Safe Power Down</span>
          </div>
          <p className="text-xs text-white/50">
            Checkpoints SQLite WAL state before turning off vehicle ignition.
          </p>
          <button
            type="button"
            onClick={handleShutdown}
            disabled={isShuttingDown}
            className="w-full glass-btn py-2.5 text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 space-x-2"
          >
            {isShuttingDown ? (
              <span>Syncing database...</span>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Shutdown System</span>
              </>
            )}
          </button>
        </LiquidGlassCard>
      </div>
    </div>
  );
};
