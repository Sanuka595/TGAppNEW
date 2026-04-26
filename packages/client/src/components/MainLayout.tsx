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
    <div className="flex flex-col h-[100dvh] relative z-10">
      <TopBar />
      
      <main className="flex-1 overflow-hidden relative">
        <div className="p-3 pb-[88px] h-full flex flex-col">
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
