import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../core/auth/AppAuth';
import { SessionProvider } from '../core/session/AppSession';
import AppRoutes from './routes';
import SessionGate from '../components/session/SessionGate';
import ClientErrorMonitor from '../components/system/ClientErrorMonitor';


function App() {
  return (
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
  );
}

export default App;
