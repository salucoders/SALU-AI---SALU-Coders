import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProfileProvider } from './context/UserProfileContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import { PWAProvider } from './context/PWAContext';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <UserProfileProvider>
          <PWAProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </PWAProvider>
        </UserProfileProvider>
      </AuthProvider>
    </NotificationProvider>
  </StrictMode>,
);
