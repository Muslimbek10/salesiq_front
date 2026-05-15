import api from './axios';

const base = '/analytics';

/** GET /api/analytics/dashboard/?date_from=&date_to= */
export const getDashboardKPIs = (params) =>
  api.get(`${base}/dashboard/`, { params }).then((r) => r.data);

/** GET /api/analytics/trends/?date_from=&date_to=&granularity= */
export const getSalesTrend = (params) =>
  api.get(`${base}/trends/`, { params }).then((r) => r.data);

/** GET /api/analytics/products/?date_from=&date_to=&metric=&limit= */
export const getProductAnalytics = (params) =>
  api.get(`${base}/products/`, { params }).then((r) => r.data);

/** GET /api/analytics/branches/?date_from=&date_to= */
export const getBranchAnalytics = (params) =>
  api.get(`${base}/branches/`, { params }).then((r) => r.data);

/** GET /api/analytics/categories/?date_from=&date_to= */
export const getCategoryAnalytics = (params) =>
  api.get(`${base}/categories/`, { params }).then((r) => r.data);

/** GET /api/analytics/customers/?date_from=&date_to= */
export const getCustomerAnalytics = (params) =>
  api.get(`${base}/customers/`, { params }).then((r) => r.data);

/** GET /api/analytics/financial/?date_from=&date_to= */
export const getFinancialAnalytics = (params) =>
  api.get(`${base}/financial/`, { params }).then((r) => r.data);
