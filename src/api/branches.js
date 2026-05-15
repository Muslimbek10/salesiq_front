import api from './axios';

const base = '/branches';

export const getBranches = (params) =>
  api.get(`${base}/`, { params }).then((r) => r.data);

export const getBranch = (id) =>
  api.get(`${base}/${id}/`).then((r) => r.data);

export const createBranch = (data) =>
  api.post(`${base}/`, data).then((r) => r.data);

export const updateBranch = (id, data) =>
  api.put(`${base}/${id}/`, data).then((r) => r.data);

export const deleteBranch = (id) =>
  api.delete(`${base}/${id}/`).then((r) => r.data);
