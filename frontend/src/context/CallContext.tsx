import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useMedia } from './MediaContext';

export type CallStatus = 'idle' | 'incoming' | 'active' | 'held';

export interface CallInfo {
  status: CallStatus;
  callerName: string;
  callerNumber: string;
  durationSeconds: number;
  isMuted: boolean;
}

interface CallContextType {
  callStatus: CallStatus;
  callerName: string;
  callerNumber: string;
  durationSeconds: number;
  isMuted: boolean;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  toggleMute: () => void;
  simulateIncomingCall: (name?: string, number?: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callerName, setCallerName] = useState<string>('Mom');
  const [callerNumber, setCallerNumber] = useState<string>('+971 50 123 4567');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const { currentTrack, pauseMedia, resumeMedia } = useMedia();
  const timerRef = useRef<number | null>(null);
  const wasMediaPlayingBeforeCall = useRef<boolean>(false);

  // Auto-pause media when call starts, and auto-resume media when call finishes
  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'active') {
      if (currentTrack.isPlaying) {
        wasMediaPlayingBeforeCall.current = true;
        pauseMedia();
      }
    } else if (callStatus === 'idle') {
      if (wasMediaPlayingBeforeCall.current) {
        wasMediaPlayingBeforeCall.current = false;
        // Brief delay to allow Bluetooth audio sink to switch back cleanly
        const resumeTimer = window.setTimeout(() => {
          resumeMedia();
        }, 600);
        return () => clearTimeout(resumeTimer);
      }
    }
  }, [callStatus]);

  // Active call duration counter
  useEffect(() => {
    if (callStatus === 'active') {
      setDurationSeconds(0);
      timerRef.current = window.setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDurationSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  // WebSocket listener for backend Bluetooth / oFono events
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
            if (data.event === 'call:incoming') {
              if (currentTrack.isPlaying) {
                wasMediaPlayingBeforeCall.current = true;
              }
              setCallerName(data.data?.caller_name || 'Mom');
              setCallerNumber(data.data?.caller_id || '+971 50 123 4567');
              setCallStatus('incoming');
              pauseMedia();
            } else if (data.event === 'call:state') {
              if (data.data?.state === 'active') {
                setCallStatus('active');
                pauseMedia();
              } else if (data.data?.state === 'idle') {
                setCallStatus('idle');
              }
            } else if (data.event === 'call:ended') {
              setCallStatus('idle');
            }
          } catch (e) {
            console.warn('Call WS message parse error:', e);
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
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [currentTrack.isPlaying, pauseMedia]);

  const answerCall = async () => {
    setCallStatus('active');
    pauseMedia();
    try {
      await fetch('/api/calls/answer', { method: 'POST' });
    } catch {
      // Local development fallback
    }
  };

  const declineCall = async () => {
    setCallStatus('idle');
    try {
      await fetch('/api/calls/reject', { method: 'POST' });
    } catch {
      // Local development fallback
    }
  };

  const hangupCall = async () => {
    setCallStatus('idle');
    try {
      await fetch('/api/calls/hangup', { method: 'POST' });
    } catch {
      // Local development fallback
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const simulateIncomingCall = (
    name = 'Mom',
    number = '+971 50 123 4567'
  ) => {
    if (currentTrack.isPlaying) {
      wasMediaPlayingBeforeCall.current = true;
      pauseMedia();
    }
    setCallerName(name);
    setCallerNumber(number);
    setCallStatus('incoming');
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callerName,
        callerNumber,
        durationSeconds,
        isMuted,
        answerCall,
        declineCall,
        hangupCall,
        toggleMute,
        simulateIncomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
