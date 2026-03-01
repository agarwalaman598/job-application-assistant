import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, verify the httpOnly cookie is still valid by calling /auth/me.
    // If it is, populate user state; if not, clear stale localStorage user.
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
        // Cookie expired / invalid — clear cached user
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // Backend sets the httpOnly cookie; we only store non-sensitive display info
    const userData = res.data.user;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const register = async (email, password, full_name) => {
    const res = await api.post('/auth/register', { email, password, full_name });
    return res.data;
  };

  const logout = async () => {
    // Clear local state immediately so UI reacts instantly
    localStorage.removeItem('user');
    setUser(null);
    try {
      await api.post('/auth/logout'); // tells backend to clear the httpOnly cookie
    } catch (e) { /* ignore — cookie will expire on its own */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

