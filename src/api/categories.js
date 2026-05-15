import api from './axios';

const base = '/categories';

export const getCategories = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

export const getCategory = (id) =>
  api.get(`${base}/${id}/`).then((r) => r.data);

export const createCategory = (data) =>
  api.post(`${base}/`, data).then((r) => r.data);

export const updateCategory = (id, data) =>
  api.put(`${base}/${id}/`, data).then((r) => r.data);

export const deleteCategory = (id) =>
  api.delete(`${base}/${id}/`).then((r) => r.data);
