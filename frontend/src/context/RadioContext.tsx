import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  type RadioStation,
  DEFAULT_RADIO_STATIONS,
} from '../services/radioService';
import { useCall } from './CallContext';

export type AudioSource = 'bluetooth' | 'radio';

interface RadioContextType {
  activeSource: AudioSource;
  setActiveSource: (source: AudioSource) => void;
  stations: RadioStation[];
  currentStation: RadioStation;
  isRadioPlaying: boolean;
  isRadioBuffering: boolean;
  playStation: (station: RadioStation) => void;
  toggleRadioPlayPause: () => void;
  nextStation: () => void;
  prevStation: () => void;
  toggleStationFavorite: (stationId: string) => void;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export const RadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSource, setActiveSource] = useState<AudioSource>('bluetooth');
  const [stations, setStations] = useState<RadioStation[]>(DEFAULT_RADIO_STATIONS);
  const [currentStation, setCurrentStation] = useState<RadioStation>(DEFAULT_RADIO_STATIONS[0]);
  const [isRadioPlaying, setIsRadioPlaying] = useState<boolean>(false);
  const [isRadioBuffering, setIsRadioBuffering] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackIndexRef = useRef<number>(0);
  const wasPlayingBeforeCallRef = useRef<boolean>(false);
  const bufferTimeoutRef = useRef<number | null>(null);

  const { callStatus } = useCall();

  const getProxiedUrl = (rawUrl: string) => {
    return `/api/radio/proxy?url=${encodeURIComponent(rawUrl)}`;
  };

  // Initialize persistent HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';

    audio.onwaiting = () => setIsRadioBuffering(true);
    audio.oncanplay = () => setIsRadioBuffering(false);
    audio.onloadeddata = () => setIsRadioBuffering(false);

    audio.onplaying = () => {
      setIsRadioBuffering(false);
      setIsRadioPlaying(true);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = null;
      }
    };

    audio.onplay = () => {
      setIsRadioPlaying(true);
    };

    audio.onpause = () => {
      setIsRadioPlaying(false);
      setIsRadioBuffering(false);
    };

    audio.onerror = () => {
      console.warn(`[Radio] Stream error on ${currentStation.name}, trying direct or fallback...`);
      
      const fallbacks = currentStation.fallbackUrls || [];
      if (fallbackIndexRef.current < fallbacks.length) {
        const nextUrl = fallbacks[fallbackIndexRef.current];
        fallbackIndexRef.current += 1;
        audio.src = getProxiedUrl(nextUrl);
        audio.play().catch((err) => console.warn('[Radio] Fallback play error:', err));
      } else {
        setIsRadioBuffering(false);
        setIsRadioPlaying(false);
      }
    };

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    };
  }, [currentStation]);

  // Save station customizations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('georgie_radio_stations_v2', JSON.stringify(stations));
    } catch {}
  }, [stations]);

  // Handle incoming/active phone calls (Auto-pause and auto-resume)
  useEffect(() => {
    const isCallActive = callStatus === 'incoming' || callStatus === 'active';
    
    if (isCallActive) {
      if (isRadioPlaying && audioRef.current) {
        wasPlayingBeforeCallRef.current = true;
        audioRef.current.pause();
      }
    } else {
      if (wasPlayingBeforeCallRef.current && audioRef.current) {
        wasPlayingBeforeCallRef.current = false;
        setTimeout(() => {
          if (activeSource === 'radio' && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }, 500);
      }
    }
  }, [callStatus, isRadioPlaying, activeSource]);

  const playStation = (station: RadioStation) => {
    setCurrentStation(station);
    setActiveSource('radio');
    fallbackIndexRef.current = 0;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = getProxiedUrl(station.streamUrl);
      audioRef.current.load();
      setIsRadioBuffering(true);

      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = window.setTimeout(() => {
        setIsRadioBuffering(false);
      }, 5000);

      audioRef.current.play().catch((err) => {
        console.warn(`[Radio] Playback error on ${station.name}:`, err);
        setIsRadioBuffering(false);
        setIsRadioPlaying(false);
      });
    }
  };

  const toggleRadioPlayPause = () => {
    if (!audioRef.current) return;

    if (isRadioPlaying) {
      audioRef.current.pause();
    } else {
      setActiveSource('radio');
      const targetSrc = getProxiedUrl(currentStation.streamUrl);
      if (!audioRef.current.src || !audioRef.current.src.includes(encodeURIComponent(currentStation.streamUrl))) {
        audioRef.current.src = targetSrc;
        audioRef.current.load();
      }
      setIsRadioBuffering(true);

      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = window.setTimeout(() => {
        setIsRadioBuffering(false);
      }, 5000);

      audioRef.current.play().catch((err) => {
        console.warn('[Radio] Play toggle error:', err);
        setIsRadioBuffering(false);
        setIsRadioPlaying(false);
      });
    }
  };

  const nextStation = () => {
    const currentIndex = stations.findIndex((s) => s.id === currentStation.id);
    const nextIndex = (currentIndex + 1) % stations.length;
    playStation(stations[nextIndex]);
  };

  const prevStation = () => {
    const currentIndex = stations.findIndex((s) => s.id === currentStation.id);
    const prevIndex = (currentIndex - 1 + stations.length) % stations.length;
    playStation(stations[prevIndex]);
  };

  const toggleStationFavorite = (stationId: string) => {
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  };

  return (
    <RadioContext.Provider
      value={{
        activeSource,
        setActiveSource,
        stations,
        currentStation,
        isRadioPlaying,
        isRadioBuffering,
        playStation,
        toggleRadioPlayPause,
        nextStation,
        prevStation,
        toggleStationFavorite,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = (): RadioContextType => {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
};
