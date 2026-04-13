import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UserProfileProvider } from './context/UserProfileContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <UserProfileProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </UserProfileProvider>
      </AuthProvider>
    </NotificationProvider>
  </StrictMode>,
);
