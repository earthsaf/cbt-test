import axios from 'axios';

// Helper function to get CSRF token from cookies
const getCSRFToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Create a function to determine the base URL
const getBaseURL = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api';
  }
  // Use the same domain as the frontend
  return `${window.location.origin}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Important for cookies/sessions
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
api.interceptors.request.use(
  config => {
    // Add auth token if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }
    
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => {
    // Handle successful responses
    return response;
  },
  error => {
    const originalRequest = error.config;
    
    // Log the full error for debugging
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data
    });
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - please check your internet connection');
      return Promise.reject({
        ...error,
        message: 'Unable to connect to the server. Please check your internet connection.'
      });
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Only redirect if not already on the login page
      if (!window.location.pathname.includes('/staff-login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/staff-login';
      }
      return Promise.reject({
        ...error,
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    // Handle other error statuses
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    return Promise.reject({
      ...error,
      message: errorMessage
    });
  }
);

export default api;