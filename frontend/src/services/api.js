import axios from 'axios';

// Create a function to determine the base URL
const getBaseURL = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api';
  }
  return 'https://cbt-test-api.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Important: This is needed for cookies to be sent with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/staff-login';
    }
    return Promise.reject(error);
  }
);

export default api;