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
      const currentPath = window.location.pathname;
      // Only redirect if the user is not on an auth page already
      const authPages = ['/staff-login', '/student-login', '/login'];
      if (!authPages.includes(currentPath)) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;