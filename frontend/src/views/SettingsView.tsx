import React, { useState, useEffect } from 'react';
import { LiquidGlassCard } from '../components/common/LiquidGlassCard';
import { Bluetooth, Power, Volume2, ShieldAlert, Smartphone, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  onBackToDash?: () => void;
}

interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  paired: boolean;
  type?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToDash }) => {
  const [gainLevel, setGainLevel] = useState<number>(75);
  const [isShuttingDown, setIsShuttingDown] = useState<boolean>(false);

  // Bluetooth State
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([
    { id: '4C:9F:F1:B6:97:F5', name: 'anas’s iPhone', connected: true, paired: true, type: 'phone' }
  ]);
  const [isPairable, setIsPairable] = useState<boolean>(false);
  const [pairableCountdown, setPairableCountdown] = useState<number>(0);
  const [loadingDeviceId, setLoadingDeviceId] = useState<string | null>(null);

  const fetchBluetoothStatus = async () => {
    try {
      const res = await fetch('/api/bluetooth/status');
      if (res.ok) {
        const data = await res.json();
        if (data.devices) {
          setBtDevices(data.devices);
        }
      }
    } catch {
      // Fallback in dev
    }
  };

  useEffect(() => {
    fetchBluetoothStatus();
    const interval = setInterval(fetchBluetoothStatus, 4000);

    // Real-time WebSocket listener for immediate Bluetooth updates
    let ws: WebSocket | null = null;
    let isMounted = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'bluetooth:status_changed') {
            if (data.data?.devices && isMounted) {
              setBtDevices(data.data.devices);
            }
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // fallback
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Pairable countdown timer
  useEffect(() => {
    let timer: number | null = null;
    if (isPairable && pairableCountdown > 0) {
      timer = window.setInterval(() => {
        setPairableCountdown((prev) => {
          if (prev <= 1) {
            setIsPairable(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPairable, pairableCountdown]);

  const handleStartPairing = async () => {
    setIsPairable(true);
    setPairableCountdown(60);
    try {
      await fetch('/api/bluetooth/pairable?enabled=true&timeout_seconds=60', { method: 'POST' });
    } catch {
      // Fallback
    }
  };

  const handleConnectDevice = async (address: string) => {
    setLoadingDeviceId(address);
    try {
      await fetch(`/api/bluetooth/connect/${encodeURIComponent(address)}`, { method: 'POST' });
      await fetchBluetoothStatus();
    } catch {
      // Fallback
    } finally {
      setLoadingDeviceId(null);
    }
  };

  const handleDisconnectDevice = async (address: string) => {
    setLoadingDeviceId(address);
    try {
      await fetch(`/api/bluetooth/disconnect/${encodeURIComponent(address)}`, { method: 'POST' });
      await fetchBluetoothStatus();
    } catch {
      // Fallback
    } finally {
      setLoadingDeviceId(null);
    }
  };

  const handleForgetDevice = async (address: string) => {
    setLoadingDeviceId(address);
    try {
      await fetch(`/api/bluetooth/forget/${encodeURIComponent(address)}`, { method: 'DELETE' });
      setBtDevices((prev) => prev.filter((d) => d.id !== address));
    } catch {
      setBtDevices((prev) => prev.filter((d) => d.id !== address));
    } finally {
      setLoadingDeviceId(null);
    }
  };

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch('/api/system/shutdown', { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
    setTimeout(() => {
      setIsShuttingDown(false);
    }, 4000);
  };

  return (
    <div className="w-full h-full p-4 overflow-hidden select-none flex flex-col justify-between font-sf">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 flex-shrink-0">
        <span className="text-base font-bold tracking-tight text-white">
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

      {/* Main 2-Column Balanced Grid */}
      <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-0 pt-3">
        {/* Left Column: Full-Height Bluetooth Device Management & Pairing */}
        <LiquidGlassCard padding="md" className="h-full flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between flex-shrink-0 mb-2">
            <div className="flex items-center space-x-2 text-white">
              <Bluetooth className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-bold">Bluetooth Devices</span>
            </div>

            <button
              type="button"
              onClick={handleStartPairing}
              disabled={isPairable}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isPairable
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95'
              }`}
            >
              {isPairable ? `Discoverable (${pairableCountdown}s)` : '+ Pair New Phone'}
            </button>
          </div>

          {/* Discoverable Hint */}
          {isPairable && (
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 flex-shrink-0 mb-2 flex items-center justify-between">
              <span>Broadcasting as <strong className="text-white">Georgie Dash</strong></span>
              <span className="text-[10px] text-sky-300 font-mono">{pairableCountdown}s</span>
            </div>
          )}

          {/* Devices List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 scrollbar-none">
            {btDevices.length > 0 ? (
              btDevices.map((dev) => {
                const isLoadingThis = loadingDeviceId === dev.id;

                return (
                  <div
                    key={dev.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                      dev.connected
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-white/[0.04] border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        dev.connected
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/10 border-white/10 text-white/70'
                      }`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white truncate max-w-[130px]">
                            {dev.name}
                          </span>
                          {dev.connected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-white/40 truncate">
                          {dev.connected ? 'Connected (Audio & Calls)' : 'Paired Device'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {dev.connected ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnectDevice(dev.id)}
                          disabled={isLoadingThis}
                          className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-colors flex items-center space-x-1"
                          title="Click to Disconnect"
                        >
                          {isLoadingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Connected</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnectDevice(dev.id)}
                          disabled={isLoadingThis}
                          className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center space-x-1"
                        >
                          {isLoadingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span>Connect</span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleForgetDevice(dev.id)}
                        disabled={isLoadingThis}
                        className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Forget & Unpair Device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center space-y-1">
                <Bluetooth className="w-6 h-6 text-white/20 mb-1" />
                <span className="font-semibold text-white/60">No Paired Devices</span>
                <span className="text-[11px] text-white/30">Tap &quot;+ Pair New Phone&quot; to connect your phone</span>
              </div>
            )}
          </div>
        </LiquidGlassCard>

        {/* Right Column: Stacked Audio Calibration & Safe Power Down */}
        <div className="h-full flex flex-col space-y-3.5 min-h-0 overflow-hidden">
          {/* 1. Audio Calibration for Cassette Deck */}
          <LiquidGlassCard padding="md" className="flex-1 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center space-x-2 text-white">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">Audio Output Calibration</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Pi line-out calibration for cassette deck headroom.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <input
                type="range"
                min="0"
                max="100"
                value={gainLevel}
                onChange={(e) => setGainLevel(Number(e.target.value))}
                className="flex-1 accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <span className="text-sm font-sf font-bold text-white tabular-nums w-10 text-right">
                {gainLevel}%
              </span>
            </div>
          </LiquidGlassCard>

          {/* 2. Power & Safe Shutdown */}
          <LiquidGlassCard padding="md" className="flex-1 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center space-x-2 text-rose-400">
                <Power className="w-4 h-4" />
                <span className="text-sm font-bold">Safe Power Down</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Checkpoints SQLite database state before turning off vehicle ignition.
              </p>
            </div>

            <button
              type="button"
              onClick={handleShutdown}
              disabled={isShuttingDown}
              className="w-full glass-btn py-2 text-xs font-bold text-red-300 border border-red-500/30 hover:bg-red-500/10 space-x-2"
            >
              {isShuttingDown ? (
                <span>Syncing database and powering down...</span>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Shutdown System</span>
                </>
              )}
            </button>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
};
