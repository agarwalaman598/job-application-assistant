import axios from 'axios';

const NETWORK_ERROR_EVENT = 'app:network-error';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('sessionExpired', '1');
      window.location.href = '/login';
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
