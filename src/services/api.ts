import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let csrfCache: string | null = null;

async function getCsrf(): Promise<string> {
  if (csrfCache) return csrfCache;
  const res = await axios.get('/api/auth/csrf', { withCredentials: true });
  const token: string = res.data.csrfToken;
  csrfCache = token;
  return token;
}

api.interceptors.request.use(async config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = await getCsrf();
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
