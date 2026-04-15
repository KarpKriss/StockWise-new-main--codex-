import { Navigate } from 'react-router-dom';
import LoadingOverlay from '../components/loaders/LoadingOverlay';
import { useAuth } from '../core/auth/AppAuth';
import { hasPermission, getHomeRoute } from '../core/config/roles';

export default function RoleRoute({ children, permission }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay open fullscreen message="Sprawdzam uprawnienia i konfiguracje widoku..." />;
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
