import api from './axios';

/**
 * POST /api/auth/login/
 * Returns { access_token, refresh_token, token_type, expires_in, user }
 */
export const login = (credentials) =>
  api.post('/auth/login/', credentials).then((r) => r.data);

/**
 * POST /api/auth/logout/
 * Blacklists the refresh token on the server.
 */
export const logout = (refreshToken) =>
  api.post('/auth/logout/', { refresh: refreshToken }).then((r) => r.data);

/** GET /api/auth/profile/ */
export const getProfile = () =>
  api.get('/auth/profile/').then((r) => r.data);

/** PATCH /api/auth/profile/ */
export const updateProfile = (data) =>
  api.patch('/auth/profile/', data).then((r) => r.data);

/** POST /api/auth/change-password/ */
export const changePassword = (data) =>
  api.post('/auth/change-password/', data).then((r) => r.data);
