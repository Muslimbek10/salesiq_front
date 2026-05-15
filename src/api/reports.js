import api from './axios';

const base = '/reports';

/** GET /api/reports/daily/?date_from=&date_to= */
export const getDailyReport = (params) =>
  api.get(`${base}/daily/`, { params }).then((r) => r.data);

/** GET /api/reports/monthly/?date_from=&date_to= */
export const getMonthlyReport = (params) =>
  api.get(`${base}/monthly/`, { params }).then((r) => r.data);

/** GET /api/reports/yearly/ */
export const getYearlyReport = () =>
  api.get(`${base}/yearly/`).then((r) => r.data);

/** GET /api/reports/branch/?date_from=&date_to= */
export const getBranchReport = (params) =>
  api.get(`${base}/branch/`, { params }).then((r) => r.data);

/** GET /api/reports/product/?date_from=&date_to=&limit= */
export const getProductReport = (params) =>
  api.get(`${base}/product/`, { params }).then((r) => r.data);
