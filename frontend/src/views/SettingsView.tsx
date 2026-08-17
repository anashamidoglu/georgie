import React, { useState } from "react";
import { Power, Sun, Moon, Bluetooth, Volume2 } from "lucide-react";
import { CardPane } from "../components/common/CardPane";

export const SettingsView: React.FC = () => {
  const [theme, setTheme] = useState<"day" | "night">("night");
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const toggleTheme = () => {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch(`http://${window.location.hostname}:8000/api/system/shutdown`, {
        method: "POST"
      });
    } catch (e) {
      console.error(e);
    }
  };

  const simulateCall = async () => {
    try {
      await fetch(`http://${window.location.hostname}:8000/api/calls/simulate_incoming?name=Sarah&number=%2B971501234567`, {
        method: "POST"
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between pb-2 border-b border-surface-raised-border">
        <h1 className="text-2xl font-bold text-text-primary">System & Preferences</h1>
        <span className="text-xs font-road text-text-muted">Georgie OS v1.0</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Appearance Mode */}
        <CardPane className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "night" ? (
              <Moon size={22} className="text-accent-amber" />
            ) : (
              <Sun size={22} className="text-accent-amber" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-primary">Display Mode</span>
              <span className="text-xs text-text-secondary capitalize">{theme} luminance theme</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl glass-surface text-xs font-bold text-text-primary touch-press"
          >
            Switch to {theme === "night" ? "Day" : "Night"}
          </button>
        </CardPane>

        {/* Dev Tool: Simulate Call */}
        <CardPane className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bluetooth size={22} className="text-accent-blue" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-primary">Simulate Incoming Call</span>
              <span className="text-xs text-text-secondary">Triggers hard interrupt & audio duck</span>
            </div>
          </div>
          <button
            onClick={simulateCall}
            className="px-4 py-2 rounded-xl bg-accent-blue/20 text-accent-blue text-xs font-bold touch-press border border-accent-blue/30"
          >
            Trigger
          </button>
        </CardPane>

        {/* Audio Gain Staging */}
        <CardPane className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 size={22} className="text-accent-green" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-primary">Audio Output</span>
              <span className="text-xs text-text-secondary">PipeWire 3.5mm Cassette Sink</span>
            </div>
          </div>
          <span className="text-xs font-road text-text-muted">100% Fixed</span>
        </CardPane>

        {/* Shutdown Control */}
        <CardPane className="flex items-center justify-between border border-accent-red/30">
          <div className="flex items-center gap-3">
            <Power size={22} className="text-accent-red" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-primary">Clean Shutdown</span>
              <span className="text-xs text-text-secondary">Syncs SQLite & powers down Pi</span>
            </div>
          </div>
          <button
            disabled={isShuttingDown}
            onClick={handleShutdown}
            className="px-4 py-2 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white text-xs font-bold touch-press"
          >
            {isShuttingDown ? "Shutting Down..." : "Power Off"}
          </button>
        </CardPane>
      </div>
    </div>
  );
};
