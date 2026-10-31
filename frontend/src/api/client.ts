import axios from 'axios';

let inMemoryToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('hiretrack_token', token);
        (window as any).__HIRETRACK_TOKEN__ = token;
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('hiretrack_token');
        delete (window as any).__HIRETRACK_TOKEN__;
      }
    } catch {
      // ignore storage access issues
    }
  }
};

export const getAccessToken = () => {
  if (!inMemoryToken && typeof window !== 'undefined') {
    inMemoryToken = localStorage.getItem('accessToken') || localStorage.getItem('hiretrack_token');
  }
  return inMemoryToken;
};

export const api = axios.create({
  baseURL: '',
  withCredentials: true, // Send and receive cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach access token if present
api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// Response interceptor: Handle automatic token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth routes
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/register') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        const newAccessToken = data.accessToken;
        setAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
