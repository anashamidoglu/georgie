import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import type { TrackMetadata, CallState, SystemStatus } from "../types";

interface WebSocketContextType {
  isConnected: boolean;
  systemStatus: SystemStatus;
  mediaTrack: TrackMetadata | null;
  callState: CallState;
  sendAction: (action: string, payload?: any) => void;
}

const defaultSystemStatus: SystemStatus = {
  connectivity: true,
  bluetooth_connected: true,
  connected_device_name: "iPhone 15 Pro",
  battery_level: 84,
  theme: "night"
};

const defaultCallState: CallState = {
  state: "idle",
  duration: 0
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(defaultSystemStatus);
  const [mediaTrack, setMediaTrack] = useState<TrackMetadata | null>({
    title: "Starboy",
    artist: "The Weeknd",
    album: "Starboy",
    duration: 230,
    position: 45,
    status: "playing",
    artwork_url: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/25/11/bf2511fe-6f19-9aa8-9f17-f58c4dc3ef33/16UMGIM61012.rgb.jpg/600x600bb.jpg"
  });
  const [callState, setCallState] = useState<CallState>(defaultCallState);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const wsUrl = `ws://${window.location.hostname}:8000/ws`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const { event: evtType, data } = JSON.parse(event.data);
          switch (evtType) {
            case "media:track_changed":
            case "media:playback_state":
              setMediaTrack(data);
              break;
            case "call:incoming":
            case "call:state":
            case "call:ended":
              setCallState(data);
              break;
            case "system:status":
              setSystemStatus(data);
              break;
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  const sendAction = (action: string, payload?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, payload }));
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        systemStatus,
        mediaTrack,
        callState,
        sendAction
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be used within WebSocketProvider");
  return ctx;
};
