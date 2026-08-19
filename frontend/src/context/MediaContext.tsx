import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { MediaTrack } from '../types';

interface MediaContextType {
  hasActiveMedia: boolean;
  setHasActiveMedia: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentTrack: MediaTrack;
  setCurrentTrack: React.Dispatch<React.SetStateAction<MediaTrack>>;
  togglePlayPause: () => Promise<void>;
  pauseMedia: () => Promise<void>;
  resumeMedia: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
}

const DEFAULT_TRACK: MediaTrack = {
  title: 'No Track Playing',
  artist: 'Connect Bluetooth to Stream',
  album: '',
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  artworkUrl: undefined,
};

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveMedia, setHasActiveMedia] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<MediaTrack>(DEFAULT_TRACK);
  const progressTimerRef = useRef<number | null>(null);

  const backendHost = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '8001';
  const apiBase = import.meta.env.VITE_BACKEND_HOST
    ? `http://${import.meta.env.VITE_BACKEND_HOST}:${backendPort}`
    : '';

  // Initial fetch of current track on mount
  useEffect(() => {
    const fetchCurrentMedia = async () => {
      try {
        const res = await fetch(`${apiBase}/api/media/current`);
        if (res.ok) {
          const trackData = await res.json();
          const isRealTrack = Boolean(
            trackData &&
            trackData.title &&
            trackData.title !== 'No Track Playing' &&
            trackData.title !== 'Unknown Track'
          );
          const isPlaying = trackData?.status === 'playing';

          if (isRealTrack && isPlaying) {
            setCurrentTrack({
              title: trackData.title,
              artist: trackData.artist || 'Unknown Artist',
              album: trackData.album || '',
              duration: trackData.duration || 0,
              currentTime: trackData.position || 0,
              isPlaying: true,
              artworkUrl: trackData.artwork_url,
            });
            setHasActiveMedia(true);
          } else {
            setCurrentTrack(DEFAULT_TRACK);
            setHasActiveMedia(false);
          }
        }
      } catch (e) {
        console.warn('Initial media fetch error:', e);
      }
    };
    fetchCurrentMedia();
  }, [apiBase]);

  // Listen to live backend WebSocket for BlueZ AVRCP track updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number | null = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${backendHost}:${backendPort}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'media:track_changed') {
              const trackData = data.data;
              if (trackData) {
                const isPlaying = trackData.status === 'playing';
                const isRealTrack = Boolean(
                  trackData.title &&
                  trackData.title !== 'No Track Playing' &&
                  trackData.title !== 'Unknown Track'
                );

                if (isRealTrack && isPlaying) {
                  setCurrentTrack({
                    title: trackData.title,
                    artist: trackData.artist || 'Unknown Artist',
                    album: trackData.album || '',
                    duration: trackData.duration || 0,
                    currentTime: trackData.position || 0,
                    isPlaying: true,
                    artworkUrl: trackData.artwork_url,
                  });
                  setHasActiveMedia(true);
                } else {
                  setCurrentTrack(DEFAULT_TRACK);
                  setHasActiveMedia(false);
                }
              }
            } else if (data.event === 'media:playback_state') {
              const trackData = data.data;
              if (trackData) {
                const isPlaying = trackData.status === 'playing';
                setCurrentTrack((prev) => ({
                  ...prev,
                  isPlaying: isPlaying,
                }));
                // Auto-collapse / auto-expand based on active playback
                setHasActiveMedia(isPlaying);
              }
            }
          } catch (e) {
            console.warn('Media WS parse error:', e);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = window.setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        reconnectTimeout = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [backendHost, backendPort]);

  // Track position timer
  useEffect(() => {
    if (currentTrack.isPlaying && currentTrack.duration > 0) {
      progressTimerRef.current = window.setInterval(() => {
        setCurrentTrack((prev) => {
          if (prev.currentTime >= prev.duration) {
            return prev;
          }
          return { ...prev, currentTime: prev.currentTime + 1 };
        });
      }, 1000);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [currentTrack.isPlaying, currentTrack.duration]);

  const togglePlayPause = async () => {
    const willPlay = !currentTrack.isPlaying;
    setCurrentTrack((prev) => ({ ...prev, isPlaying: willPlay }));
    setHasActiveMedia(willPlay);
    try {
      await fetch(`${apiBase}/api/media/${willPlay ? 'play' : 'pause'}`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const pauseMedia = async () => {
    setCurrentTrack((prev) => ({ ...prev, isPlaying: false }));
    setHasActiveMedia(false);
    try {
      await fetch(`${apiBase}/api/media/pause`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const resumeMedia = async () => {
    setCurrentTrack((prev) => ({ ...prev, isPlaying: true }));
    setHasActiveMedia(true);
    try {
      await fetch(`${apiBase}/api/media/play`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const nextTrack = async () => {
    try {
      await fetch(`${apiBase}/api/media/next`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const prevTrack = async () => {
    try {
      await fetch(`${apiBase}/api/media/previous`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  return (
    <MediaContext.Provider
      value={{
        hasActiveMedia,
        setHasActiveMedia,
        currentTrack,
        setCurrentTrack,
        togglePlayPause,
        pauseMedia,
        resumeMedia,
        nextTrack,
        prevTrack,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export function useMedia(): MediaContextType {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
}
