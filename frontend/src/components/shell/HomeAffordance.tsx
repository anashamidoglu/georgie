import React from 'react';
import { LayoutGrid, Settings } from 'lucide-react';

interface HomeAffordanceProps {
  activeTab?: 'dashboard' | 'nav' | 'media' | 'settings';
  onSelectTab?: (tab: 'dashboard' | 'nav' | 'media' | 'settings') => void;
  isExpandedNav?: boolean;
  onCollapseNav?: () => void;
}

export const HomeAffordance: React.FC<HomeAffordanceProps> = ({
  activeTab = 'dashboard',
  onSelectTab,
  isExpandedNav,
  onCollapseNav,
}) => {
  return (
    <nav className="w-full h-12 px-6 flex items-center justify-between border-t border-white/[0.06] bg-[#09090b] select-none z-30 font-sf">
      {/* Left: Home / Dashboard Affordance */}
      <button
        type="button"
        onClick={() => {
          if (isExpandedNav) {
            onCollapseNav?.();
          }
          onSelectTab?.('dashboard');
        }}
        aria-label="Home Dashboard"
        className={`glass-btn px-4 h-9 space-x-2 ${
          activeTab === 'dashboard' && !isExpandedNav
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-xs font-semibold tracking-wide">
          DASH
        </span>
      </button>

      {/* Right: Settings Action Button */}
      <button
        type="button"
        onClick={() => onSelectTab?.('settings')}
        aria-label="Settings"
        className={`glass-btn w-9 h-9 ${
          activeTab === 'settings'
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:text-white'
        }`}
      >
        <Settings className="w-4 h-4" />
      </button>
    </nav>
  );
};
