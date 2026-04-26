import React from 'react';
import { TopBar } from './TopBar.js';
import { BottomNavigation } from './BottomNavigation.js';
import { useUiStore } from '../store/uiStore';

interface Props {
  children: React.ReactNode;
}

export const MainLayout: React.FC<Props> = ({ children }) => {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-white relative z-10">
      <TopBar />
      
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-4 min-h-full">
          {children}
        </div>
      </main>
      
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};
