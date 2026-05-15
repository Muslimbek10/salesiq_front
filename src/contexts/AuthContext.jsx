/**
 * AuthContext
 * -----------
 * Provides: user, isAuthenticated, isLoading, login(), logout()
 *
 * Tokens are stored in localStorage.
 * The Axios instance reads them directly from localStorage, so no circular
 * dependency between this context and the API layer.
 */
import { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';
import { TOKEN_KEY, REFRESH_KEY, USER_KEY } from '@/utils/constants';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while reading storage

  // ── Restore session from localStorage ──────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token  = localStorage.getItem(TOKEN_KEY);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearStorage();
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const data = await apiLogin(credentials);
    // Backend returns access_token / refresh_token (not access / refresh)
    localStorage.setItem(TOKEN_KEY,   data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY,    JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    try {
      if (refresh) await apiLogout(refresh);
    } catch {
      // swallow — we still clear local state
    } finally {
      clearStorage();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
