import axios, { AxiosError } from 'axios';

export interface ApiErrorResponse {
  error: string;
  detail?: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for Express sessions (cookies)
});

// Interceptor to transform axios errors into structured user-friendly formats
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    let errorMessage = 'An unexpected error occurred.';
    let status = error.response?.status;

    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please check your internet connection and try again.';
      status = 408;
    } else if (error.message === 'Network Error') {
      errorMessage = 'Network error. Please make sure the server is running and you have internet access.';
      status = 503;
    } else if (error.response) {
      // Backend sent an explicit error payload
      errorMessage = error.response.data?.error || errorMessage;
    }

    return Promise.reject({
      message: errorMessage,
      status: status || 500,
      originalError: error,
    });
  }
);

export default api;
export { api };
