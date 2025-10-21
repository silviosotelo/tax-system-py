import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile')
};

export const transactionsAPI = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  create: (data: any) => api.post('/transactions', data),
  delete: (id: string) => api.delete(`/transactions/${id}`)
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getCharts: (type: string, months?: number) =>
    api.get('/dashboard/charts', { params: { type, months } })
};

export const ivaAPI = {
  calculate: (year: number, month: number) =>
    api.get(`/iva/${year}/${month}`),
  getTrend: (months?: number) =>
    api.get('/iva/trend', { params: { months } }),
  generateForm120: (year: number, month: number) =>
    api.get(`/iva/${year}/${month}/form120`)
};

export const irpAPI = {
  calculate: (year: number) => api.get(`/irp/${year}`),
  getProjection: (year: number, month: number) =>
    api.get(`/irp/${year}/${month}/projection`),
  generateForm515: (year: number) => api.get(`/irp/${year}/form515`)
};

export const scraperAPI = {
  execute: (data: any) => api.post('/scraper/execute', data),
  getSessionStatus: (sessionId: string) =>
    api.get(`/scraper/session/${sessionId}`),
  getHistory: () => api.get('/scraper/history')
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data)
};
