import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProfileProvider } from './context/UserProfileContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import { PWAProvider } from './context/PWAContext';
import { registerSW } from 'virtual:pwa-register';

// Register service worker safely
if ('serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true });
  } catch (swErr) {
    console.warn('Service worker registration skipped:', swErr);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </StrictMode>,
);
