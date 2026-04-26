import WebApp from '@twa-dev/sdk';

/**
 * Checks if the application is running inside Telegram Web App.
 */
export const isTmaAvailable = (): boolean => {
  return typeof window !== 'undefined' && WebApp.initData !== '';
};

/**
 * Triggers haptic feedback with safe check.
 */
export const triggerHaptic = (
  type: 'impact' | 'notification' | 'selection',
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium'
) => {
  try {
    if (type === 'impact') {
      WebApp.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy');
    } else if (type === 'notification') {
      WebApp.HapticFeedback.notificationOccurred(style as 'success' | 'warning' | 'error');
    } else {
      WebApp.HapticFeedback.selectionChanged();
    }
  } catch (e) {
    console.debug('Haptic feedback not supported in this environment');
  }
};

/**
 * Cloud Storage helpers (TMA API 6.9+)
 */
export const cloudStorage = {
  setItem: (key: string, value: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        WebApp.CloudStorage.setItem(key, value, (error, success) => {
          if (error) console.error('CloudStorage Error:', error);
          resolve(!!success);
        });
      } catch (e) {
        resolve(false);
      }
    });
  },
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        WebApp.CloudStorage.getItem(key, (error, value) => {
          if (error) console.error('CloudStorage Error:', error);
          resolve(value || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  },
};

/**
 * Biometric Manager helpers (TMA API 7.2+)
 */
export const biometrics = {
  requestAccess: (reason: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!WebApp.BiometricManager.isInited) {
          WebApp.BiometricManager.init(() => {
            WebApp.BiometricManager.requestAccess({ reason }, (success) => resolve(!!success));
          });
        } else {
          WebApp.BiometricManager.requestAccess({ reason }, (success) => resolve(!!success));
        }
      } catch (e) {
        resolve(false);
      }
    });
  },
};

/**
 * Initializes the WebApp and sets basic UI theme.
 */
export const initTma = () => {
  if (!isTmaAvailable()) return;

  WebApp.ready();
  WebApp.expand();
  
  try {
    // @ts-ignore - Some older versions of @twa-dev/sdk might not have this in types
    if (WebApp.enableVerticalSwipes) {
      WebApp.enableVerticalSwipes();
    }
  } catch (e) {
    console.debug('enableVerticalSwipes not supported');
  }
  
  // Set theme-based colors
  WebApp.setHeaderColor('bg_color');
  WebApp.setBackgroundColor('bg_color');
};

export const getTmaUser = () => WebApp.initDataUnsafe.user || null;
export const getTmaStartParam = () => WebApp.initDataUnsafe.start_param || null;

export default WebApp;
