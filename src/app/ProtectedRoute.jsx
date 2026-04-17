import { Navigate } from 'react-router-dom';
import LoadingOverlay from '../components/loaders/LoadingOverlay';
import { useAuth } from '../core/auth/AppAuth';
import { useAppPreferences } from '../core/preferences/AppPreferences';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useAppPreferences();

  if (loading) {
    return <LoadingOverlay open fullscreen message={t('loaders.protectedRoute')} />;
  }

  if (!user || user.status !== 'active') {
    return <Navigate to="/login" />;
  }

  return children;
}
