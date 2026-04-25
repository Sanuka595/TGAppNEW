import { useCallback, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { RadialBoard } from './components/game/RadialBoard';
import { GarageView } from './components/game/GarageView';
import { MarketView } from './components/game/MarketView';
import { ActionModal } from './components/game/ActionModal';
import { MultiplayerModal } from './components/game/MultiplayerModal';
import { useGameStore, initSocketListeners } from './store/gameStore';
import { useUiStore } from './store/uiStore';
import { useTelegram } from './hooks/useTelegram';
import { getTmaStartParam } from './lib/tmaProvider';

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
      case 'board':
      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 pt-4 h-full">
            <RadialBoard />
            
            {/* Quick Logs Summary */}
            <div className="w-full max-w-xs bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
              <div className="text-[10px] text-white/30 uppercase mb-3 font-bold tracking-widest">События</div>
              <div className="space-y-2 h-24 overflow-y-auto scrollbar-hide">
                {logs.length > 0 ? (
                  logs.slice(0, 3).map((log, i) => (
                    <div key={i} className={`text-xs leading-tight ${log.type === 'error' ? 'text-red-400' : 'text-white/70'}`}>
                      <span className="opacity-30 mr-2">•</span>{log.text}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-white/20 italic">Ожидание начала игры...</div>
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
    </MainLayout>
  );
}
