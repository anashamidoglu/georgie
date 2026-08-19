import React, { createContext, useContext, useState } from 'react';
import type { MediaTrack } from '../types';

interface MediaContextType {
  hasActiveMedia: boolean;
  setHasActiveMedia: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentTrack: MediaTrack;
  setCurrentTrack: React.Dispatch<React.SetStateAction<MediaTrack>>;
  togglePlayPause: () => void;
  pauseMedia: () => void;
  resumeMedia: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const DEFAULT_TRACK: MediaTrack = {
  title: 'Beneath the Mask',
  artist: 'Lyn',
  album: 'Persona 5 (Original Soundtrack)',
  duration: 278,
  currentTime: 45,
  isPlaying: true,
  artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/10/fe/ad10fee6-76eb-7eaa-a632-c2afece21b53/LNCM-1175_PERSONA5-OST_h1_new.jpg/600x600bb.jpg',
};

const NEXT_TRACK: MediaTrack = {
  title: 'Last Surprise',
  artist: 'Lyn',
  album: 'Persona 5 (Original Soundtrack)',
  duration: 235,
  currentTime: 14,
  isPlaying: true,
  artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/10/fe/ad10fee6-76eb-7eaa-a632-c2afece21b53/LNCM-1175_PERSONA5-OST_h1_new.jpg/600x600bb.jpg',
};

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveMedia, setHasActiveMedia] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<MediaTrack>(DEFAULT_TRACK);

  const togglePlayPause = () => {
    setCurrentTrack((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  };

  const pauseMedia = () => {
    setCurrentTrack((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  };

  const resumeMedia = () => {
    setCurrentTrack((prev) => ({
      ...prev,
      isPlaying: true,
    }));
  };

  const nextTrack = () => {
    setCurrentTrack(NEXT_TRACK);
  };

  const prevTrack = () => {
    setCurrentTrack(DEFAULT_TRACK);
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
