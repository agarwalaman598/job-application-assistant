import axios from 'axios';

const NETWORK_ERROR_EVENT = 'app:network-error';
const LOGOUT_MARKER_KEY = 'auth:logoutAt';
const LOGOUT_GRACE_MS = 15000;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// Attach Bearer token from localStorage on every request (cross-domain auth)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — only redirect if not already on auth pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error?.response && error?.code !== 'ERR_CANCELED') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));
      }
    }

    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/')
    ) {
      const logoutAt = Number(sessionStorage.getItem(LOGOUT_MARKER_KEY) || 0);
      const isLogoutFlow = logoutAt > 0 && Date.now() - logoutAt < LOGOUT_GRACE_MS;
      if (isLogoutFlow) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('sessionExpired', '1');
      if (typeof window !== 'undefined') {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?next=${encodeURIComponent(current)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extract a user-friendly error message from an Axios error.
 * Handles network failures, FastAPI detail strings, and fallback text.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.detail) return err.response.data.detail;
  if (!err?.response) return 'Network error — please check your connection.';
  return fallback;
}

export default api;
