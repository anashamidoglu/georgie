import React, { useState } from 'react';
import { StatusBar } from './components/shell/StatusBar';
import { HomeAffordance } from './components/shell/HomeAffordance';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { NavProvider, useNav } from './context/NavContext';
import { MediaProvider } from './context/MediaContext';
import { CallProvider, useCall } from './context/CallContext';
import { CallInterruptBanner } from './components/calls/CallInterruptBanner';

const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nav' | 'media' | 'settings'>('dashboard');
  const { isNavExpanded, setIsNavExpanded } = useNav();
  const { callStatus } = useCall();

  // Show floating call interrupt banner ONLY when nav is expanded to full-screen (split-view has the docked call card)
  const showExpandedCallBanner = isNavExpanded && callStatus !== 'idle';

  return (
    <main className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sf">
      {/* 1024x600 Fixed/Fluid Carputer Viewport Container */}
      <div 
        id="carputer-viewport"
        className="w-full h-full max-w-[1024px] max-h-[600px] bg-[#08080a] relative flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10 md:rounded-[28px]"
      >
        {/* Top Status Bar */}
        <StatusBar />

        {/* Global Floating Call Interrupt Banner (Over Expanded Navigation / Active Map) */}
        {showExpandedCallBanner && (
          <div className="absolute top-14 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <CallInterruptBanner />
          </div>
        )}

        {/* Main Content Area */}
        <section className="flex-1 w-full relative overflow-hidden">
          {activeTab === 'settings' ? (
            <SettingsView onBackToDash={() => setActiveTab('dashboard')} />
          ) : (
            <DashboardView />
          )}
        </section>

        {/* Bottom Home & Physical Affordance Bar */}
        <HomeAffordance
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'dashboard' || tab === 'settings') {
              setIsNavExpanded(false);
            }
          }}
          isExpandedNav={isNavExpanded}
          onCollapseNav={() => setIsNavExpanded(false)}
        />
      </div>
    </main>
  );
};

export const App: React.FC = () => {
  return (
    <MediaProvider>
      <CallProvider>
        <NavProvider>
          <AppShell />
        </NavProvider>
      </CallProvider>
    </MediaProvider>
  );
};

export default App;
