import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar.js';
import { BottomNavigation } from './BottomNavigation.js';
import { useGameStore } from '../store/gameStore';

interface Props {
  children: React.ReactNode;
}

export const MainLayout: React.FC<Props> = ({ children }) => {
  const { activeTab, setActiveTab } = useGameStore();
  const [localActiveTab, setLocalActiveTab] = useState(activeTab);

  // Sync local state with store
  useEffect(() => {
    setLocalActiveTab(activeTab);
  }, [activeTab]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-tg-bg text-tg-text">
      <TopBar />
      
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-4 min-h-full">
          {children}
          {/* Placeholder based on tab */}
          <div className="mt-8 flex flex-col items-center justify-center opacity-50">
            <h2 className="text-xl font-bold uppercase tracking-tighter">
              Раздел: {localActiveTab}
            </h2>
            <p className="text-xs mt-2">Здесь скоро будет контент...</p>
          </div>
        </div>
      </main>
      
      <BottomNavigation 
        activeTab={localActiveTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          setLocalActiveTab(tab);
        }} 
      />
    </div>
  );
};
