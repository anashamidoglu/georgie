import React from "react";
import { LayoutGrid, Navigation } from "lucide-react";
import { useNav } from "../../context/NavContext";

export const HomeAffordance: React.FC<{
  currentRoute: "dashboard" | "settings";
  onNavigateHome: () => void;
}> = ({ currentRoute, onNavigateHome }) => {
  const { navExpanded, setNavExpanded } = useNav();

  const handleClick = () => {
    if (navExpanded) {
      setNavExpanded(false);
    }
    onNavigateHome();
  };

  const isHome = currentRoute === "dashboard" && !navExpanded;

  return (
    <button
      onClick={handleClick}
      aria-label="Home"
      className={`fixed bottom-5 left-5 z-40 w-14 h-14 rounded-2xl glass-surface flex items-center justify-center touch-press transition-all duration-300 ${
        isHome ? "text-accent-amber border-accent-amber/40" : "text-text-primary"
      }`}
    >
      {navExpanded ? (
        <LayoutGrid size={24} strokeWidth={2} />
      ) : (
        <Navigation size={24} strokeWidth={2} />
      )}
    </button>
  );
};
