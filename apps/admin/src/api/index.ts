import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1', timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((res) => {
  const body = res.data;
  if (body.code !== 0) return Promise.reject(new Error(body.message));
  return body.data;
});

export default api;
