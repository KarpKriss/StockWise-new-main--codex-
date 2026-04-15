import { Navigate } from 'react-router-dom';
import LoadingOverlay from '../components/loaders/LoadingOverlay';
import { useAuth } from '../core/auth/AppAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay open fullscreen message="Sprawdzam dostep i przygotowuje widok..." />;
  }

  if (!user || user.status !== 'active') {
    return <Navigate to="/login" />;
  }

  return children;
}
