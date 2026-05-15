import api from './axios';

const base = '/products';

export const getProducts = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

export const getProduct = (id) =>
  api.get(`${base}/${id}/`).then((r) => r.data);

export const createProduct = (data) =>
  api.post(`${base}/`, data).then((r) => r.data);

export const updateProduct = (id, data) =>
  api.put(`${base}/${id}/`, data).then((r) => r.data);

export const patchProduct = (id, data) =>
  api.patch(`${base}/${id}/`, data).then((r) => r.data);

export const deleteProduct = (id) =>
  api.delete(`${base}/${id}/`).then((r) => r.data);

export const getLowStockProducts = (params) =>
  api.get(`${base}/low_stock/`, { params }).then((r) => r.data);
