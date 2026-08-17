import React from "react";
import { Play, Pause, SkipForward, SkipBack, Disc } from "lucide-react";
import { CardPane } from "../common/CardPane";
import { useWebSocket } from "../../context/WebSocketContext";

export const MediaDockedCard: React.FC = () => {
  const { mediaTrack } = useWebSocket();

  if (!mediaTrack) {
    return (
      <CardPane className="h-full flex items-center justify-center text-text-muted">
        <div className="flex items-center gap-2">
          <Disc size={20} />
          <span className="text-sm font-medium">No Media Playing</span>
        </div>
      </CardPane>
    );
  }

  const isPlaying = mediaTrack.status === "playing";

  const handleAction = async (action: string) => {
    try {
      await fetch(`http://${window.location.hostname}:8000/api/media/${action}`, {
        method: "POST"
      });
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (secs: number = 0) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = mediaTrack.duration
    ? ((mediaTrack.position || 0) / mediaTrack.duration) * 100
    : 0;

  return (
    <CardPane padding={0} className="h-full flex flex-col justify-between p-0">
      {/* Top Half: Asymmetric Artwork & Metadata */}
      <div className="flex items-start gap-4 p-4">
        {/* Flush Square Artwork */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-raised shrink-0 border border-surface-raised-border shadow-sm">
          {mediaTrack.artwork_url ? (
            <img
              src={mediaTrack.artwork_url}
              alt={mediaTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <Disc size={28} />
            </div>
          )}
        </div>

        {/* Text Metadata with bold hierarchy */}
        <div className="flex flex-col min-w-0 justify-center h-20">
          <span className="text-xs uppercase tracking-wider text-accent-amber font-bold mb-0.5">
            Now Playing
          </span>
          <h3 className="text-lg font-bold text-text-primary truncate leading-snug">
            {mediaTrack.title}
          </h3>
          <p className="text-sm font-medium text-text-secondary truncate">
            {mediaTrack.artist}
          </p>
        </div>
      </div>

      {/* Bottom Half: Progress scrubber & Transport controls */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="w-full">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-amber transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-road text-text-muted mt-1 tabular-nums">
            <span>{formatTime(mediaTrack.position)}</span>
            <span>{formatTime(mediaTrack.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-1">
          <button
            onClick={() => handleAction("previous")}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-text-secondary touch-press"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={() => handleAction(isPlaying ? "pause" : "play")}
            className="w-12 h-12 rounded-full bg-text-primary text-bg-base flex items-center justify-center touch-press shadow-md"
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} className="ml-0.5" fill="currentColor" />
            )}
          </button>

          <button
            onClick={() => handleAction("next")}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-text-secondary touch-press"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </CardPane>
  );
};
