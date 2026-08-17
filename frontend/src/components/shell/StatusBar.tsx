import React, { useState, useEffect } from "react";
import { Wifi, Bluetooth, BatteryCharging } from "lucide-react";
import { MediaPill } from "./MediaPill";
import { useWebSocket } from "../../context/WebSocketContext";

export const StatusBar: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { systemStatus } = useWebSocket();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 px-6 flex items-center justify-between z-30 select-none border-b border-surface-raised-border/40 bg-bg-base/80">
      {/* Left: Clock with DIN 1451 tabular numerals */}
      <div
        onClick={onOpenSettings}
        className="flex items-center gap-3 cursor-pointer touch-press"
      >
        <span className="font-road text-2xl font-bold tracking-tight tabular-nums text-text-primary">
          {time || "12:00"}
        </span>
      </div>

      {/* Center: Expandable Media Pill */}
      <div className="flex-1 flex justify-center px-4">
        <MediaPill />
      </div>

      {/* Right: Telemetry & Connection Indicators */}
      <div className="flex items-center gap-4 text-text-secondary">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Bluetooth
            size={16}
            className={
              systemStatus.bluetooth_connected
                ? "text-accent-blue opacity-100"
                : "text-text-muted opacity-40"
            }
          />
          {systemStatus.connected_device_name && (
            <span className="truncate max-w-[100px]">
              {systemStatus.connected_device_name}
            </span>
          )}
        </div>

        <Wifi
          size={16}
          className={
            systemStatus.connectivity
              ? "text-text-primary opacity-90"
              : "text-text-muted opacity-40"
          }
        />

        <div className="flex items-center gap-1">
          <BatteryCharging size={16} className="text-accent-green" />
          <span className="font-road text-xs font-semibold tabular-nums text-text-primary">
            {systemStatus.battery_level ?? 100}%
          </span>
        </div>
      </div>
    </header>
  );
};
