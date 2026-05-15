import api from './axios';

const base = '/alerts';

/** GET /api/alerts/?is_active=&priority_level=&alert_type= */
export const getAlerts = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

/** GET /api/alerts/counts/ */
export const getAlertCounts = () =>
  api.get(`${base}/counts/`).then((r) => r.data);

/** POST /api/alerts/generate/ */
export const generateAlerts = (config = {}) =>
  api.post(`${base}/generate/`, config).then((r) => r.data);

/** POST /api/alerts/:id/dismiss/ */
export const dismissAlert = (id) =>
  api.post(`${base}/${id}/dismiss/`).then((r) => r.data);
