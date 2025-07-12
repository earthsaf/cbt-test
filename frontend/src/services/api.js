import axios from 'axios';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' 
    ? 'http://localhost:4000/api' 
    : '/api',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Detect current route when using HashRouter ("#/staff-login" etc.)
      const currentHash = (window.location.hash || '').toLowerCase();
      const authFragments = ['staff-login', 'student-login', 'login'];
      const onAuthPage = authFragments.some(frag => currentHash.includes(frag));
      if (!onAuthPage) {
        // Default to staff-login so user can choose role again
        window.location.hash = '#/staff-login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;