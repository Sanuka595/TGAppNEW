declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date: number;
          hash: string;
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        BackButton?: {
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show?: () => void;
          hide?: () => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          selectionChanged: () => void;
          notificationOccurred: (type: 'success' | 'warning' | 'error' | 'info') => void;
        };
      };
    };
  }
}

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.Telegram?.WebApp;
}

// Проверка наличия TMA SDK
export function isTelegramWebAppAvailable(): boolean {
  return Boolean(getTelegramWebApp()?.initDataUnsafe);
}

// Получение данных пользователя из TMA
export function getTelegramUser(): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
} | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

// Получение start_param из TMA или URL
export function getStartParam(): string | null {
  const webApp = getTelegramWebApp();
  if (webApp?.initDataUnsafe) {
    return webApp.initDataUnsafe.start_param ?? null;
  }
  
  // Fallback для URLSearchParams
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('startapp') || null;
  } catch {
    return null;
  }
}

// Haptic Feedback utility
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection' | 'error'): void {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        haptic.impactOccurred('light');
        break;
      case 'medium':
        haptic.impactOccurred('medium');
        break;
      case 'heavy':
        haptic.impactOccurred('heavy');
        break;
      case 'selection':
        haptic.selectionChanged();
        break;
      case 'error':
        haptic.notificationOccurred('error');
        break;
    }
  } catch {
    // HapticFeedback может быть недоступен в некоторых версиях
  }
}

// Safe wrapper для WebApp методов
export function safeWebAppReady(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.ready();
  } catch (e) {
    console.warn('WebApp.ready() failed:', e);
  }
}

export function safeWebAppExpand(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.expand();
  } catch (e) {
    console.warn('WebApp.expand() failed:', e);
  }
}

export function safeSetHeaderColor(color: 'bg_color' | 'secondary_bg_color' | `#${string}`): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.setHeaderColor(color);
  } catch (e) {
    console.warn('WebApp.setHeaderColor() failed:', e);
  }
}

export function safeSetBackgroundColor(color: 'bg_color' | 'secondary_bg_color' | `#${string}`): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.setBackgroundColor(color);
  } catch (e) {
    console.warn('WebApp.setBackgroundColor() failed:', e);
  }
}

// BackButton handler
export function setupBackButton(onClick: () => void): (() => void) | undefined {
  const backButton = getTelegramWebApp()?.BackButton;
  if (!backButton) return;
  
  try {
    backButton.show?.();
    backButton.onClick(onClick);
    return () => {
      backButton.offClick(onClick);
    };
  } catch {
    // BackButton может быть недоступен
  }
}

// Dev mode fallback
export function isDevMode(): boolean {
  return !isTelegramWebAppAvailable();
}
