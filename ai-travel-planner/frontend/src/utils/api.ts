import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s timeout for AI generation calls
});

// ─── Request interceptor — inject JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),

  getMe: () => api.get('/api/auth/me'),
};

// ─── Trips ────────────────────────────────────────────────────────────────────
export const tripsApi = {
  getAll: () => api.get('/api/trips'),

  getById: (id: string) => api.get(`/api/trips/${id}`),

  generate: (data: {
    destination: string;
    durationDays: number;
    budgetTier: string;
    interests: string[];
    travelMonth: string;
  }) => api.post('/api/trips/generate', data),

  update: (id: string, data: object) => api.put(`/api/trips/${id}`, data),

  regenerateDay: (id: string, dayNumber: number, instruction: string) =>
    api.patch(`/api/trips/${id}/day/${dayNumber}/regenerate`, { instruction }),

  regeneratePackingList: (id: string) =>
    api.patch(`/api/trips/${id}/packing/regenerate`),

  delete: (id: string) => api.delete(`/api/trips/${id}`),
};

export default api;