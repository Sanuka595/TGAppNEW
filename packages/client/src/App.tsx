import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { MainLayout } from './components/MainLayout.js';

export default function App(): JSX.Element {
  useEffect(() => {
    // Initialize Telegram Web App
    WebApp.ready();
    WebApp.expand();
    
    // Configure colors based on Telegram theme
    WebApp.setHeaderColor('secondary_bg_color');
    WebApp.setBackgroundColor('bg_color');
  }, []);

  return (
    <MainLayout>
      <div className="flex flex-col gap-4">
        <div className="bg-tg-secondary-bg p-4 rounded-2xl border border-tg-hint/10 shadow-sm">
          <h1 className="text-xl font-bold text-tg-accent">Перекуп D6</h1>
          <p className="text-sm text-tg-hint mt-1">
            Добро пожаловать в симулятор перекупа в Telegram!
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-tg-button/10 p-3 rounded-xl border border-tg-button/20">
            <span className="text-xs text-tg-button font-bold uppercase tracking-widest">Статистика</span>
            <div className="mt-2 text-2xl font-black">0</div>
            <div className="text-[10px] text-tg-hint uppercase">Машин продано</div>
          </div>
          <div className="bg-tg-accent/10 p-3 rounded-xl border border-tg-accent/20">
            <span className="text-xs text-tg-accent font-bold uppercase tracking-widest">Репутация</span>
            <div className="mt-2 text-2xl font-black">100</div>
            <div className="text-[10px] text-tg-hint uppercase">Очков</div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
