import api from './axios';

const base = '/forecast';

/** POST /api/forecast/run/ */
export const runForecast = (data) =>
  api.post(`${base}/run/`, data).then((r) => r.data);

/** GET /api/forecast/history/?target_type=&target_id=&model_name= */
export const getForecastHistory = (params) =>
  api.get(`${base}/history/`, { params }).then((r) => r.data);

/** GET /api/forecast/history/:id/ */
export const getForecast = (id) =>
  api.get(`${base}/history/${id}/`).then((r) => r.data);
