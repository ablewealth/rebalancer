const API_BASE_URL = 'http://localhost:8742';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  note?: string;
}

export class ApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest<T = any>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying
      console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      await delay(retryDelay * (attempt + 1)); // Exponential backoff
    }
  }
  
  // If we get here, all retries failed
  throw new ApiError(
    `Failed to connect to server after ${maxRetries + 1} attempts. Please ensure the backend server is running on port 8742.`,
    0,
    { originalError: lastError?.message }
  );
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: <T = any>(endpoint: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
};

export default apiClient;