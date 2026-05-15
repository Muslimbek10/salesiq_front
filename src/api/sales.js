import api from './axios';

const base = '/sales';

/** GET /api/sales/?page=&page_size=&product_id=&branch_id=&date_from=&date_to= */
export const getSales = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

/** GET /api/sales/:id/ */
export const getSale = (id) =>
  api.get(`${base}/${id}/`).then((r) => r.data);

/** POST /api/sales/ */
export const createSale = (data) =>
  api.post(`${base}/`, data).then((r) => r.data);

/** PUT /api/sales/:id/ */
export const updateSale = (id, data) =>
  api.put(`${base}/${id}/`, data).then((r) => r.data);

/** DELETE /api/sales/:id/ */
export const deleteSale = (id) =>
  api.delete(`${base}/${id}/`).then((r) => r.data);

/** GET /api/sales/summary/ */
export const getSalesSummary = (params) =>
  api.get(`${base}/summary/`, { params }).then((r) => r.data);

/** GET /api/sales/export/ — returns a CSV blob */
export const exportSales = (params) =>
  api.get(`${base}/export/`, {
    params,
    responseType: 'blob',
  }).then((r) => r.data);
