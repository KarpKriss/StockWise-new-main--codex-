import { Navigate } from 'react-router-dom';
import LoadingOverlay from '../components/loaders/LoadingOverlay';
import { useAuth } from '../core/auth/AppAuth';
import { hasPermission, getHomeRoute } from '../core/config/roles';
import { useAppPreferences } from '../core/preferences/AppPreferences';

export default function RoleRoute({ children, permission }) {
  const { user, loading } = useAuth();
  const { t } = useAppPreferences();

  if (loading) {
    return <LoadingOverlay open fullscreen message={t('loaders.roleRoute')} />;
  }

  if (!user || user.status !== 'active') {
    return <Navigate to="/login" />;
  }

  if (!user.role) {
    console.error('Brak roli uzytkownika');
    return <Navigate to="/login" />;
  }

  const normalizedRole = user.role.toLowerCase();

  if (!hasPermission(normalizedRole, permission)) {
    return <Navigate to={getHomeRoute(normalizedRole)} />;
  }

  return children;
}
