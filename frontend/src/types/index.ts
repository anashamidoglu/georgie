export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  position?: number;
  status: "playing" | "paused" | "stopped";
  artwork_url?: string;
}

export interface CallState {
  state: "idle" | "incoming" | "dialing" | "active" | "held";
  caller_id?: string;
  caller_name?: string;
  duration: number;
}

export interface SystemStatus {
  connectivity: boolean;
  bluetooth_connected: boolean;
  connected_device_name?: string;
  battery_level?: number;
  theme: "day" | "night";
}

export interface LaneComponent {
  type: "lane";
  indications: ("left" | "straight" | "right" | "slight left" | "slight right" | "uturn")[];
  active: boolean;
  valid: boolean;
}

export interface BannerInstruction {
  distance_along_geometry: number;
  primary: {
    text: string;
    type: string;
    modifier?: string;
    components: { text: string; type: string }[];
  };
  sub?: {
    text?: string;
    components?: LaneComponent[];
  };
}

export interface RouteData {
  distance: number; // meters
  duration: number; // seconds
  eta: string;
  next_maneuver?: {
    instruction: string;
    distance_meters: number;
    modifier?: string;
    type?: string;
  };
  speed_limit?: number; // km/h
  lanes?: LaneComponent[];
}
