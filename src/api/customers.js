import api from './axios';

const base = '/customers';

export const getCustomers = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

export const getCustomer = (id) =>
  api.get(`${base}/${id}/`).then((r) => r.data);

export const createCustomer = (data) =>
  api.post(`${base}/`, data).then((r) => r.data);

export const updateCustomer = (id, data) =>
  api.put(`${base}/${id}/`, data).then((r) => r.data);

export const patchCustomer = (id, data) =>
  api.patch(`${base}/${id}/`, data).then((r) => r.data);

export const deleteCustomer = (id) =>
  api.delete(`${base}/${id}/`).then((r) => r.data);
