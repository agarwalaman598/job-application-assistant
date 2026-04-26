import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);
const LOGOUT_MARKER_KEY = 'auth:logoutAt';
const LOGOUT_GRACE_MS = 15000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip the API call entirely if there's no token — avoids a guaranteed 401 on every page load
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      return;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      // Optimistically set user from cache so UI doesn't flash, then verify
      setUser(JSON.parse(savedUser));
    }
    api.get('/auth/me')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(() => {
        // Token expired / invalid — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // Store JWT in localStorage for cross-domain Bearer token auth
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token);
    }
    const userData = res.data.user;
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.removeItem(LOGOUT_MARKER_KEY);
    setUser(userData);
    return res.data;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token);
    }
    const userData = res.data.user;
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.removeItem(LOGOUT_MARKER_KEY);
    setUser(userData);
    return res.data;
  };

  const register = async (email, password, full_name) => {
    const res = await api.post('/auth/register', { email, password, full_name });
    return res.data;
  };

  const logout = async () => {
    sessionStorage.setItem(LOGOUT_MARKER_KEY, String(Date.now()));
    setTimeout(() => {
      sessionStorage.removeItem(LOGOUT_MARKER_KEY);
    }, LOGOUT_GRACE_MS);
    try {
      await api.post('/auth/logout'); // tells backend to clear the httpOnly cookie
    } catch { /* ignore — token will expire on its own */ }
    finally {
      // Clear local auth after request settles so sign-out loading UI can render.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

