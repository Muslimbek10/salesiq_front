import api from './axios';

const base = '/recommendations';

/** GET /api/recommendations/?is_active=&priority_level=&recommendation_type= */
export const getRecommendations = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

/** POST /api/recommendations/generate/ */
export const generateRecommendations = (config = {}) =>
  api.post(`${base}/generate/`, config).then((r) => r.data);

/** POST /api/recommendations/:id/dismiss/ */
export const dismissRecommendation = (id) =>
  api.post(`${base}/${id}/dismiss/`).then((r) => r.data);

/** POST /api/recommendations/:id/reactivate/ */
export const reactivateRecommendation = (id) =>
  api.post(`${base}/${id}/reactivate/`).then((r) => r.data);
