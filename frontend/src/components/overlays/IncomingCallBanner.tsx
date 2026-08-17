import React from "react";
import { Phone, PhoneOff, User } from "lucide-react";
import { useWebSocket } from "../../context/WebSocketContext";

export const IncomingCallBanner: React.FC = () => {
  const { callState } = useWebSocket();

  if (callState.state === "idle") return null;

  const isIncoming = callState.state === "incoming";
  const isActive = callState.state === "active";

  const handleAnswer = async () => {
    try {
      await fetch(`http://${window.location.hostname}:8000/api/calls/answer`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleHangup = async () => {
    try {
      await fetch(`http://${window.location.hostname}:8000/api/calls/hangup`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-xl animate-in slide-in-from-top-6 duration-300">
      <div className="glass-surface border border-accent-red/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
        {/* Caller Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-accent-red/20 text-accent-red flex items-center justify-center border border-accent-red/40 animate-pulse">
            <User size={24} />
          </div>

          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-accent-red font-bold">
              {isIncoming ? "Incoming Phone Call" : "Call In Progress"}
            </span>
            <span className="text-base font-bold text-text-primary">
              {callState.caller_name || "Unknown Caller"}
            </span>
            <span className="text-xs font-road text-text-secondary">
              {isActive ? formatDuration(callState.duration) : callState.caller_id || ""}
            </span>
          </div>
        </div>

        {/* Call Action Buttons */}
        <div className="flex items-center gap-3">
          {isIncoming && (
            <button
              onClick={handleAnswer}
              className="w-12 h-12 rounded-full bg-accent-green hover:bg-accent-green/90 text-white flex items-center justify-center touch-press shadow-lg"
            >
              <Phone size={22} fill="currentColor" />
            </button>
          )}

          <button
            onClick={handleHangup}
            className="w-12 h-12 rounded-full bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center touch-press shadow-lg"
          >
            <PhoneOff size={22} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};
