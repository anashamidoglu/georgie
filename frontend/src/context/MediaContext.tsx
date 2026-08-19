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
  const stopDebounceRef = useRef<number | null>(null);

  // Initial fetch of current track on mount
  useEffect(() => {
    const fetchCurrentMedia = async () => {
      try {
        const res = await fetch('/api/media/current');
        if (res.ok) {
          const trackData = await res.json();
          const isReal = Boolean(
            trackData &&
            trackData.title &&
            trackData.title !== 'No Track Playing' &&
            trackData.title !== 'Unknown Track' &&
            trackData.title.trim() !== '' &&
            trackData.status !== 'stopped'
          );

          if (isReal) {
            setCurrentTrack({
              title: trackData.title,
              artist: trackData.artist || 'Unknown Artist',
              album: trackData.album || '',
              duration: trackData.duration || 0,
              currentTime: trackData.position || 0,
              isPlaying: trackData.status === 'playing',
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
  }, []);

  // Listen to live backend WebSocket for BlueZ AVRCP track updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number | null = null;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'media:track_changed') {
              const trackData = data.data;
              if (
                trackData &&
                trackData.title &&
                trackData.title !== 'No Track Playing' &&
                trackData.title !== 'Unknown Track' &&
                trackData.title.trim() !== ''
              ) {
                // Cancel any pending stop debounce since a new track has arrived
                if (stopDebounceRef.current) {
                  clearTimeout(stopDebounceRef.current);
                  stopDebounceRef.current = null;
                }

                const isPlaying = trackData.status === 'playing';
                setCurrentTrack((prev) => ({
                  title: trackData.title,
                  artist: trackData.artist || 'Unknown Artist',
                  album: trackData.album || '',
                  duration: trackData.duration || 0,
                  currentTime: typeof trackData.position === 'number' ? trackData.position : prev.currentTime,
                  isPlaying: isPlaying,
                  artworkUrl: trackData.artwork_url || prev.artworkUrl,
                }));
                setHasActiveMedia(true);
              } else if (trackData?.status === 'stopped' || trackData?.title === 'No Track Playing') {
                // Debounce clearing to prevent track switch flickering
                if (!stopDebounceRef.current) {
                  stopDebounceRef.current = window.setTimeout(() => {
                    setCurrentTrack(DEFAULT_TRACK);
                    setHasActiveMedia(false);
                    stopDebounceRef.current = null;
                  }, 2000);
                }
              }
            } else if (data.event === 'media:playback_state') {
              const trackData = data.data;
              if (trackData) {
                const status = trackData.status || 'stopped';
                if (status === 'stopped') {
                  setCurrentTrack((prev) => ({ ...prev, isPlaying: false }));
                  if (!stopDebounceRef.current) {
                    stopDebounceRef.current = window.setTimeout(() => {
                      setCurrentTrack(DEFAULT_TRACK);
                      setHasActiveMedia(false);
                      stopDebounceRef.current = null;
                    }, 2000);
                  }
                } else {
                  // Active play or pause
                  if (stopDebounceRef.current) {
                    clearTimeout(stopDebounceRef.current);
                    stopDebounceRef.current = null;
                  }
                  const isPlaying = status === 'playing';
                  setCurrentTrack((prev) => ({
                    ...prev,
                    isPlaying: isPlaying,
                    currentTime: typeof trackData.position === 'number' ? trackData.position : prev.currentTime,
                    duration: typeof trackData.duration === 'number' && trackData.duration > 0 ? trackData.duration : prev.duration,
                  }));
                  setHasActiveMedia(true);
                }
              }
            }
          } catch (e) {
            console.warn('Media WS parse error:', e);
          }
        };

        ws.onclose = () => {
          if (isComponentMounted) {
            reconnectTimeout = window.setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        if (isComponentMounted) {
          reconnectTimeout = window.setTimeout(connect, 2000);
        }
      }
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (stopDebounceRef.current) clearTimeout(stopDebounceRef.current);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

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
    try {
      await fetch(`/api/media/${willPlay ? 'play' : 'pause'}`, { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const pauseMedia = async () => {
    setCurrentTrack((prev) => ({ ...prev, isPlaying: false }));
    try {
      await fetch('/api/media/pause', { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const resumeMedia = async () => {
    setCurrentTrack((prev) => ({ ...prev, isPlaying: true }));
    try {
      await fetch('/api/media/play', { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const nextTrack = async () => {
    try {
      await fetch('/api/media/next', { method: 'POST' });
    } catch {
      // Dev mode fallback
    }
  };

  const prevTrack = async () => {
    try {
      await fetch('/api/media/previous', { method: 'POST' });
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
