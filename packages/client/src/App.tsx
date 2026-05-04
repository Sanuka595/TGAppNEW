import { useCallback, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { RadialBoard } from './components/game/RadialBoard';
import { GarageView } from './components/game/GarageView';
import { MarketView } from './components/game/MarketView';
import { ActionModal } from './components/game/ActionModal';
import { MultiplayerModal } from './components/game/MultiplayerModal';
import { DealsView } from './components/game/DealsView';
import { RaceModal } from './components/game/RaceModal';
import { useGameStore, initSocketListeners } from './store/gameStore';
import { useUiStore } from './store/uiStore';
import { useTelegram } from './hooks/useTelegram';
import { getTmaStartParam } from './lib/tmaProvider';
import { DevPanel } from './components/game/DevPanel';
import { EventFeed } from './components/game/EventFeed';

export default function App(): JSX.Element {
  const { haptic, webApp } = useTelegram();
  const activeTab = useUiStore((s) => s.activeTab);
  const logs = useGameStore(s => s.logs);

  const handleStartParam = useCallback((param: string) => {
    if (param === 'solo') {
      useGameStore.getState().startSoloMode();
      haptic('impact', 'medium');
      return;
    }

    if (param === 'multi') {
      useUiStore.getState().setIsCreateRoomModalOpen(true);
      haptic('impact', 'medium');
      return;
    }

    if (param === 'reset') {
      useGameStore.getState().resetAccount();
      haptic('impact', 'medium');
      return;
    }

    useGameStore.getState().joinRoom(param.toUpperCase());
    haptic('impact', 'medium');
  }, [haptic]);

  const handleBackButton = useCallback(() => {
    const handled = useUiStore.getState().closeTopUiLayer();
    if (handled) {
      haptic('impact', 'light');
    }
  }, [haptic]);

  const theme = useUiStore((s) => s.theme);
  
  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    initSocketListeners();
    
    const backButton = webApp.BackButton;
    backButton.onClick(handleBackButton);
    backButton.show();

    // Handle deep links
    const startParam = getTmaStartParam();
    if (startParam) {
      handleStartParam(startParam);
    }

    return () => {
      backButton.offClick(handleBackButton);
    };
  }, [handleBackButton, handleStartParam, webApp]);

  const renderContent = () => {
    switch (activeTab) {
      case 'garage':
        return <GarageView />;
      case 'market':
        return <MarketView />;
      case 'deals':
        return <DealsView />;
      case 'board':
      default:
        return (
          <div className="flex flex-col items-center gap-3 flex-1 min-h-0">
            {/* Board fills all available flex space */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center touch-none">
              <RadialBoard />
            </div>

            {/* Compact event log — fixed height, never grows */}
            <div className="w-full max-w-sm shrink-0 glass-panel bg-black/20 rounded-2xl px-4 py-3">
              <div className="text-[9px] text-white/30 uppercase mb-2 font-black tracking-widest">
                События
              </div>
              <div className="space-y-1.5 h-16 overflow-y-auto scrollbar-hide">
                {logs.length > 0 ? (
                  logs.slice(0, 3).map((log, i) => (
                    <div
                      key={i}
                      className={`text-[11px] leading-tight ${log.type === 'error' ? 'text-red-400' : 'text-white/70'}`}
                    >
                      <span className="opacity-30 mr-1.5">•</span>{log.text}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-white/20 italic">Ожидание начала игры...</div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      {renderContent()}
      <ActionModal />
      <MultiplayerModal />
      <RaceModal />
      <EventFeed />
      <DevPanel />
    </MainLayout>
  );
}
