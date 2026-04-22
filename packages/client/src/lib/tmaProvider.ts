import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

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
          offClick: () => void;
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

// Проверка наличия TMA SDK
export function isTelegramWebAppAvailable(): boolean {
  return typeof window !== 'undefined' && 
         (window.Telegram as any) !== undefined && 
         (window.Telegram as any).WebApp !== undefined &&
         (window.Telegram as any).WebApp.initDataUnsafe !== undefined;
}

// Получение данных пользователя из TMA
export function getTelegramUser(): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
} | null {
  if (!isTelegramWebAppAvailable()) return null;
  return (window.Telegram as any).WebApp.initDataUnsafe?.user || null;
}

// Получение start_param из TMA или URL
export function getStartParam(): string | null {
  if (isTelegramWebAppAvailable()) {
    return (window.Telegram as any).WebApp.initDataUnsafe?.start_param || null;
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
  if (isTelegramWebAppAvailable()) {
    try {
      // Используем нативный HapticFeedback API через window.Telegram.WebApp
      const haptic = (window.Telegram as any).WebApp.HapticFeedback;
      switch (type) {
        case 'light':
          haptic?.impactOccurred('light');
          break;
        case 'medium':
          haptic?.impactOccurred('medium');
          break;
        case 'heavy':
          haptic?.impactOccurred('heavy');
          break;
        case 'selection':
          haptic?.selectionChanged();
          break;
        case 'error':
          haptic?.notificationOccurred('error');
          break;
      }
    } catch {
      // HapticFeedback может быть недоступен в некоторых версиях
    }
  }
}

// Safe wrapper для WebApp методов
export function safeWebAppReady(): void {
  if (!isTelegramWebAppAvailable()) return;
  try {
    WebApp.ready();
  } catch (e) {
    console.warn('WebApp.ready() failed:', e);
  }
}

export function safeWebAppExpand(): void {
  if (!isTelegramWebAppAvailable()) return;
  try {
    WebApp.expand();
  } catch (e) {
    console.warn('WebApp.expand() failed:', e);
  }
}

export function safeSetHeaderColor(color: 'bg_color' | 'secondary_bg_color' | `#${string}`): void {
  if (!isTelegramWebAppAvailable()) return;
  try {
    WebApp.setHeaderColor(color);
  } catch (e) {
    console.warn('WebApp.setHeaderColor() failed:', e);
  }
}

export function safeSetBackgroundColor(color: 'bg_color' | 'secondary_bg_color' | `#${string}`): void {
  if (!isTelegramWebAppAvailable()) return;
  try {
    WebApp.setBackgroundColor(color);
  } catch (e) {
    console.warn('WebApp.setBackgroundColor() failed:', e);
  }
}

// BackButton handler
export function setupBackButton(onClick: () => void): (() => void) | undefined {
  if (!isTelegramWebAppAvailable()) return;
  
  try {
    const backButtonHandler = () => {
      onClick(); // Execute the provided callback
      triggerHapticFeedback('light');
    };
    WebApp.BackButton?.onClick(backButtonHandler);
    return () => {
      WebApp.BackButton?.offClick(backButtonHandler); // Cleanup: remove the specific handler
    };
  } catch {
    // BackButton может быть недоступен
  }
}

// Dev mode fallback
export function isDevMode(): boolean {
  return !(isTelegramWebAppAvailable as any)();
}
