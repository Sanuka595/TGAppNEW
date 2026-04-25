import { useEffect, useState } from 'react';
import WebApp, { 
  initTma, 
  isTmaAvailable, 
  getTmaUser, 
  triggerHaptic,
  cloudStorage,
  biometrics
} from '../lib/tmaProvider';

/**
 * Custom hook to interact with Telegram Mini App features.
 */
export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isTmaAvailable()) {
      initTma();
      setIsReady(true);
    }
  }, []);

  const user = getTmaUser();

  return {
    isReady,
    isTma: isTmaAvailable(),
    user,
    webApp: WebApp,
    haptic: triggerHaptic,
    storage: cloudStorage,
    biometrics: biometrics,
    onClose: () => WebApp.close(),
  };
};
