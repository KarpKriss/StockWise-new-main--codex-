import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../core/auth/AppAuth';
import { AppPreferencesProvider } from '../core/preferences/AppPreferences';
import { SessionProvider } from '../core/session/AppSession';
import AppRoutes from './routes';
import SessionGate from '../components/session/SessionGate';
import ClientErrorMonitor from '../components/system/ClientErrorMonitor';


function App() {
  return (
    <AppPreferencesProvider>
      <AuthProvider>
        <SessionProvider>
          <BrowserRouter>
            <ClientErrorMonitor />
            <SessionGate>
              <AppRoutes />
            </SessionGate>
          </BrowserRouter>
        </SessionProvider>
      </AuthProvider>
    </AppPreferencesProvider>
  );
}

export default App;
