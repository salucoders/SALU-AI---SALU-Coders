import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface PWAContextType {
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<void>;
  deferredPrompt: any;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (navigator as any).standalone || 
                          document.referrer.includes('android-app://');
      setInstalled(isStandalone);
    };

    checkInstalled();
    
    if ((window as any).deferredPWAEvent) {
      setDeferredPrompt((window as any).deferredPWAEvent);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWAEvent = e;
    };

    const appInstalledHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const value = {
    canInstall: !!deferredPrompt && !installed,
    installed,
    install,
    deferredPrompt
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
