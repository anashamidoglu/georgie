import React, { createContext, useContext, useState, useEffect } from 'react';

interface SystemContextType {
  isOnline: boolean;
  isBluetoothConnected: boolean;
  connectedDeviceName: string | null;
  theme: 'day' | 'night';
  setTheme: (theme: 'day' | 'night') => void;
  checkConnection: () => Promise<void>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState<boolean>(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [theme, setThemeState] = useState<'day' | 'night'>(() => {
    try {
      const saved = localStorage.getItem('georgie_theme');
      if (saved === 'day' || saved === 'night') return saved;
    } catch {}
    return 'night';
  });

  const setTheme = (newTheme: 'day' | 'night') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('georgie_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch {}
  };

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const data = await res.json();
        setIsOnline(Boolean(data.is_online));
      }
    } catch {
      setIsOnline(navigator.onLine);
    }
  };

  // 1. Monitor Browser Network Connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnection();
    const interval = setInterval(checkConnection, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // 2. Fetch and Subscribe to Bluetooth Connection Status
  useEffect(() => {
    const fetchBtStatus = async () => {
      try {
        const res = await fetch('/api/bluetooth/status');
        if (res.ok) {
          const data = await res.json();
          const isConn = Boolean(
            data.connected_device ||
            (Array.isArray(data.devices) && data.devices.some((d: any) => d.connected))
          );
          setIsBluetoothConnected(isConn);
          setConnectedDeviceName(data.connected_device || null);
        }
      } catch (e) {
        console.warn('Failed to fetch Bluetooth status:', e);
      }
    };

    fetchBtStatus();

    // WebSocket listener for live Bluetooth updates
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'bluetooth:status_changed') {
            const data = payload.data;
            const isConn = Boolean(
              data.connected_device ||
              (Array.isArray(data.devices) && data.devices.some((d: any) => d.connected))
            );
            setIsBluetoothConnected(isConn);
            setConnectedDeviceName(data.connected_device || null);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <SystemContext.Provider
      value={{
        isOnline,
        isBluetoothConnected,
        connectedDeviceName,
        theme,
        setTheme,
        checkConnection,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = (): SystemContextType => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
