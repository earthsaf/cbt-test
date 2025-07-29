import axios from 'axios';

// Create a function to determine the base URL
const getBaseURL = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api';
  }
  // For production, use the same origin as the frontend
  return `${window.location.origin}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  timeout: 30000, // 30 seconds timeout
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  validateStatus: function (status) {
    // Resolve only if the status code is less than 500
    return status < 500;
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details for debugging
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

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