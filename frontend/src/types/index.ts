export type DriveMode = 'DRY' | 'WET' | 'SPORT' | 'TOUR' | 'RACE';

export type ConnectivityStatus = {
  cellular: '5G' | 'LTE' | '3G' | 'NO_SIGNAL';
  wifi: boolean;
  bluetooth: boolean;
  gpsActive: boolean;
};

export type MediaTrack = {
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  currentTime: number; // in seconds
  isPlaying: boolean;
  artworkUrl?: string | null;
};

export type TelemetryState = {
  speedKmh: number;
  powerKw: number;
  gear: 'P' | 'R' | 'N' | 'D';
  tempOutsideC: number;
  driveMode: DriveMode;
  powerMode: 'TOUR' | 'SPORT';
};
