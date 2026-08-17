import React, { useState } from "react";
import { WebSocketProvider } from "./context/WebSocketContext";
import { NavProvider, useNav } from "./context/NavContext";
import { StatusBar } from "./components/shell/StatusBar";
import { HomeAffordance } from "./components/shell/HomeAffordance";
import { IncomingCallBanner } from "./components/overlays/IncomingCallBanner";
import { MapboxContainer } from "./components/nav/MapboxContainer";
import { DashboardView } from "./views/DashboardView";
import { SettingsView } from "./views/SettingsView";

const AppContent: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<"dashboard" | "settings">("dashboard");
  const { navExpanded } = useNav();

  return (
    <div className="w-screen h-screen flex flex-col bg-bg-base text-text-primary overflow-hidden relative select-none">
      {/* 1. Global Call Interrupt Overlay */}
      <IncomingCallBanner />

      {/* 2. Top Status Bar */}
      <StatusBar onOpenSettings={() => setCurrentRoute(currentRoute === "settings" ? "dashboard" : "settings")} />

      {/* 3. Main Workspace Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Persistent Mapbox Canvas Layer */}
        <div
          className={`absolute transition-all duration-300 ${
            currentRoute === "settings"
              ? "opacity-0 pointer-events-none"
              : navExpanded
              ? "inset-4 z-10"
              : "top-4 bottom-4 left-4 w-[calc(62%-16px)] z-10 rounded-[20px] overflow-hidden"
          }`}
        >
          <MapboxContainer isVisible={currentRoute !== "settings"} />
        </div>

        {/* View Switcher Layer */}
        {currentRoute === "dashboard" ? (
          <DashboardView />
        ) : (
          <SettingsView />
        )}
      </main>

      {/* 4. Persistent Home / Nav Collapse Button */}
      <HomeAffordance
        currentRoute={currentRoute}
        onNavigateHome={() => setCurrentRoute("dashboard")}
      />
    </div>
  );
};

export default function App() {
  return (
    <WebSocketProvider>
      <NavProvider>
        <AppContent />
      </NavProvider>
    </WebSocketProvider>
  );
}
