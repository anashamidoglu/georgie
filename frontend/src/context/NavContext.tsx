import React, { createContext, useContext, useState } from "react";
import type { RouteData } from "../types";

interface NavContextType {
  navExpanded: boolean;
  setNavExpanded: (expanded: boolean) => void;
  toggleNavExpanded: () => void;
  activeRoute: RouteData | null;
  setActiveRoute: (route: RouteData | null) => void;
  currentSpeed: number;
}

const defaultRoute: RouteData = {
  distance: 6400,
  duration: 540,
  eta: "16:25",
  speed_limit: 100,
  next_maneuver: {
    instruction: "In 400m, take Exit 45 toward Financial Centre",
    distance_meters: 400,
    modifier: "right",
    type: "turn"
  },
  lanes: [
    { type: "lane", indications: ["straight"], active: false, valid: true },
    { type: "lane", indications: ["straight"], active: false, valid: true },
    { type: "lane", indications: ["straight", "right"], active: true, valid: true },
    { type: "lane", indications: ["right"], active: true, valid: true }
  ]
};

const NavContext = createContext<NavContextType | null>(null);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navExpanded, setNavExpanded] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(defaultRoute);
  const [currentSpeed] = useState(88); // km/h

  const toggleNavExpanded = () => setNavExpanded((prev) => !prev);

  return (
    <NavContext.Provider
      value={{
        navExpanded,
        setNavExpanded,
        toggleNavExpanded,
        activeRoute,
        setActiveRoute,
        currentSpeed
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
};
