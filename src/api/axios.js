/**
 * Configured Axios instance.
 *
 * Request interceptor  → attaches Authorization: Bearer <access_token>
 * Response interceptor → on 401, silently refreshes the access token using
 *                        the refresh token and retries the original request.
 *                        On refresh failure, clears storage and redirects to /login.
 */
import axios from 'axios';
import { TOKEN_KEY, REFRESH_KEY, USER_KEY } from '@/utils/constants';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor (token refresh) ─────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) =>
    error ? prom.reject(error) : prom.resolve(token),
  );
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      // Queue subsequent 401s while a refresh is in-flight
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing     = true;

      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        // SimpleJWT expects { refresh } and returns { access[, refresh] }
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccess = data.access;
        localStorage.setItem(TOKEN_KEY, newAccess);
        if (data.refresh) {
          localStorage.setItem(REFRESH_KEY, data.refresh);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        original.headers.Authorization            = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

function clearAuthAndRedirect() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}

export default api;
