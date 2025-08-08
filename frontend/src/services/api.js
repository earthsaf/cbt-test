import axios from 'axios';

// Create a function to determine the base URL
const getBaseURL = () => {
  // In production, use relative URLs to avoid CORS issues
  if (process.env.NODE_ENV === 'production') {
    return '/api';  // Relative URL for same-origin requests
  }
  return 'http://localhost:4000/api'; // Local development
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Important for cookies/sessions
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
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
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    const originalRequest = error.config;
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - please check your internet connection');
      return Promise.reject({
        ...error,
        message: 'Unable to connect to the server. Please check your internet connection.'
      });
    }
    
    // Handle 401 Unauthorized - only redirect if not already on login page
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.includes('login');
      if (!isLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/staff-login';
      }
    }
    
    // Return error to be handled by the calling component
    return Promise.reject({
      ...error,
      message: error.response?.data?.message || 
              error.message || 
              'An unexpected error occurred'
    });
  }
);

export default api;