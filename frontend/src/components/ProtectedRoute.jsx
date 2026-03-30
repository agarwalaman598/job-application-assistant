import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LOGOUT_MARKER_KEY = 'auth:logoutAt';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const isLogoutFlow = !!sessionStorage.getItem(LOGOUT_MARKER_KEY);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isLogoutFlow) {
      return <Navigate to="/" replace />;
    }

    const next = `${location.pathname}${location.search}${location.hash}`;
    const target = `/login?next=${encodeURIComponent(next)}`;
    return <Navigate to={target} replace />;
  }

  return children;
}
