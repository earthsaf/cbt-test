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
    const requestId = Math.random().toString(36).substring(2, 9);
    config.metadata = { startTime: new Date(), requestId };
    
    // Log request details
    console.log(`[API Request ${requestId}] ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      headers: config.headers,
      params: config.params,
      data: config.data
    });
    
    // Add auth token if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('[API Request Error]', {
      message: error.message,
      config: error.config,
      stack: error.stack
    });
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => {
    const { config, status, data } = response;
    const { requestId, startTime } = config.metadata || {};
    const duration = startTime ? new Date() - startTime : 'N/A';
    
    // Log successful responses
    console.log(`[API Response ${requestId || '?'}] ${status} ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`, {
      status,
      data,
      headers: response.headers,
      config: {
        baseURL: config.baseURL,
        params: config.params
      }
    });
    
    return response;
  },
  error => {
    const originalRequest = error.config || {};
    const { requestId, startTime } = originalRequest.metadata || {};
    const duration = startTime ? new Date() - startTime : 'N/A';
    
    // Log detailed error information
    const errorDetails = {
      requestId,
      duration: duration + 'ms',
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        ...(error.response?.data?.error && { serverError: error.response.data.error })
      },
      config: {
        baseURL: originalRequest?.baseURL,
        withCredentials: originalRequest?.withCredentials,
        headers: originalRequest?.headers
      }
    };
    
    console.error(`[API Error ${requestId || '?'}] ${errorDetails.status || 'NO_STATUS'} ${errorDetails.method} ${errorDetails.url}`, errorDetails);
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      const networkError = {
        ...error,
        isNetworkError: true,
        message: 'Unable to connect to the server. Please check your internet connection.'
      };
      console.error('Network error:', networkError);
      return Promise.reject(networkError);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Special case: Don't redirect for specific endpoints that might return 401 normally
      const publicEndpoints = ['/auth/test', '/auth/session'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint)
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
          console.log(`[Auth] Session expired, redirecting to login (requestId: ${requestId})`);
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