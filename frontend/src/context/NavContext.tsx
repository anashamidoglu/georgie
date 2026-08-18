import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useCurrentPosition } from '../hooks/useCurrentPosition';

interface EtaInfo {
  arrival: string;
  duration: string;
  distance: string;
}

interface NavContextType {
  isNavExpanded: boolean;
  setIsNavExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  hasActiveRoute: boolean;
  setHasActiveRoute: (val: boolean | ((prev: boolean) => boolean)) => void;
  coords: [number, number];
  heading: number | null;
  speed: number | null;
  mapInstance: MapboxMap | null;
  setMapInstance: (map: MapboxMap | null) => void;
  eta: EtaInfo;
  setEta: React.Dispatch<React.SetStateAction<EtaInfo>>;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(false);
  const [hasActiveRoute, setHasActiveRoute] = useState<boolean>(true);
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [eta, setEta] = useState<EtaInfo>({
    arrival: '10:30 arrival',
    duration: '20 min',
    distance: '47 km',
  });

  const position = useCurrentPosition();

  // Keep map camera synced with position changes if map is loaded
  useEffect(() => {
    if (mapInstance && position.coords) {
      mapInstance.easeTo({
        center: position.coords,
        duration: 1000,
      });
    }
  }, [mapInstance, position.coords]);

  return (
    <NavContext.Provider
      value={{
        isNavExpanded,
        setIsNavExpanded,
        hasActiveRoute,
        setHasActiveRoute,
        coords: position.coords,
        heading: position.heading,
        speed: position.speed,
        mapInstance,
        setMapInstance,
        eta,
        setEta,
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export function useNav(): NavContextType {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within a NavProvider');
  }
  return context;
}
