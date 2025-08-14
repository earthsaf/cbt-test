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
  response => {
    // Log successful responses for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  error => {
    const originalRequest = error.config;
    
    // Log detailed error information
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        withCredentials: originalRequest?.withCredentials,
        headers: originalRequest?.headers
      }
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
      // Special case: Don't redirect for specific endpoints that might return 401 normally
      const publicEndpoints = ['/auth/test', '/auth/session'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        originalRequest.url.includes(endpoint)
      );
      
      if (isPublicEndpoint) {
        return Promise.reject(error);
      }
      
      // If we get a 401 and this isn't a retry, try to refresh the token
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Clear any existing auth data
        localStorage.removeItem('token');
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('login')) {
          console.log('Session expired, redirecting to login');
          window.location.href = '/';
        }
      }
      
      return Promise.reject(error);
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