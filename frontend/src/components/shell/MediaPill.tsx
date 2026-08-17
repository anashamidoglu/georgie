import React from "react";
import { Play, Pause, Disc } from "lucide-react";
import { useWebSocket } from "../../context/WebSocketContext";

export const MediaPill: React.FC = () => {
  const { mediaTrack } = useWebSocket();

  if (!mediaTrack) return null;

  const isPlaying = mediaTrack.status === "playing";

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://${window.location.hostname}:8000/api/media/${isPlaying ? "pause" : "play"}`, {
        method: "POST"
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="glass-surface h-10 px-3 rounded-full flex items-center gap-2.5 max-w-[280px] touch-press cursor-pointer">
      {/* Mini Artwork / Icon */}
      {mediaTrack.artwork_url ? (
        <img
          src={mediaTrack.artwork_url}
          alt="Album art"
          className="w-6 h-6 rounded-full object-cover animate-spin-slow shrink-0"
          style={{ animationPlayState: isPlaying ? "running" : "paused" }}
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-surface-raised flex items-center justify-center shrink-0">
          <Disc size={14} className="text-text-muted" />
        </div>
      )}

      {/* Track info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-text-primary truncate leading-tight">
          {mediaTrack.title}
        </span>
        <span className="text-[10px] text-text-secondary truncate leading-tight">
          {mediaTrack.artist}
        </span>
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={handleToggle}
        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-text-primary shrink-0 transition-colors"
      >
        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
      </button>
    </div>
  );
};
