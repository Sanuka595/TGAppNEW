import React from 'react';
import type { ActiveTab } from '../store/uiStore';

type NavItem = ActiveTab;

interface Props {
  activeTab: NavItem;
  onTabChange: (tab: NavItem) => void;
}

export const BottomNavigation: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavItem; label: string; icon: string }[] = [
    { id: 'garage', label: 'Гараж', icon: '🚗' },
    { id: 'market', label: 'Рынок', icon: '🏪' },
    { id: 'board', label: 'Игра', icon: '🎲' },
  ];

  return (
    <div className="bg-tg-secondary-bg border-t border-tg-hint/20 flex justify-around items-center h-16 safe-area-bottom sticky bottom-0 z-10">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
            activeTab === item.id ? 'text-tg-button' : 'text-tg-hint'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          {activeTab === item.id && (
            <div className="w-1 h-1 bg-tg-button rounded-full mt-0.5" />
          )}
        </button>
      ))}
    </div>
  );
};
