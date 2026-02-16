// Clean version of Robust Authentication and Error Handling System
// This module provides centralized auth handling and retry logic for all API calls

interface AuthTokens {
  jwt_token?: string;
  user_data?: any;
  refresh_token?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryOn401: boolean;
  retryOnTimeout: boolean;
}

class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryOn401: true,
    retryOnTimeout: true
  };

  private constructor() {}

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  // Get authentication token with fallback logic
  getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      // Try to get JWT token first
      const jwtToken = localStorage.getItem('jwt_token');
      if (jwtToken && jwtToken !== 'undefined' && jwtToken !== 'null') {
        console.log('🔑 Using JWT token for authentication');
        return jwtToken;
      }

      // Fallback to user_data token if available
      const userData = localStorage.getItem('user_data');
      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.token) {
            console.log('🔑 Using user_data token for authentication');
            return parsedData.token;
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse user_data:', e);
        }
      }

      // Try legacy token storage
      const legacyToken = localStorage.getItem('token');
      if (legacyToken && legacyToken !== 'undefined' && legacyToken !== 'null') {
        console.log('🔑 Using legacy token for authentication');
        return legacyToken;
      }

      console.warn('⚠️ No valid authentication token found');
      return null;
    } catch (error) {
      console.error('❌ Error retrieving auth token:', error);
      return null;
    }
  }

  // Store authentication tokens properly
  storeAuthTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    try {
      if (tokens.jwt_token) {
        localStorage.setItem('jwt_token', tokens.jwt_token);
        localStorage.setItem('token', tokens.jwt_token); // Legacy support
      }
      
      if (tokens.user_data) {
        localStorage.setItem('user_data', JSON.stringify(tokens.user_data));
      }
      
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      
      console.log('✅ Authentication tokens stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth tokens:', error);
    }
  }

  // Clear all authentication data
  clearAuthTokens(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('refresh_token');
      console.log('🧹 Authentication tokens cleared');
    } catch (error) {
      console.error('❌ Error clearing auth tokens:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAuthToken();
    return token !== null && token !== 'undefined' && token !== 'null';
  }

  // Get user data from storage
  getUserData(): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem('user_data');
      if (userData && userData !== 'undefined' && userData !== 'null') {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get API base URL
  getApiBaseUrl(): string {
    return '';  // Use relative paths for same-origin requests
  }

  // Handle authentication errors
  private async handleAuthError(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      console.log('🔄 Handling authentication error...');
      
      // Try to refresh token if refresh token exists
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        console.log('🔄 Attempting token refresh...');
        // This would call your refresh endpoint
      } else {
        console.log('⚠️ No refresh token available, clearing auth data');
        this.clearAuthTokens();
      }
    } catch (error) {
      console.error('❌ Error handling auth error:', error);
      this.clearAuthTokens();
    }
  }

  // Login method (unauthenticated)
  async login<T = any>(email: string, password: string): Promise<ApiResponse<T>> {
    const url = `${this.getApiBaseUrl()}/api/auth/login`;
    
    try {
      console.log(`🔐 Attempting login for: ${email}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Login successful');
      
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      return {
        success: false,
        error: error.message,
        status: 0
      };
    }
  }

  // Authenticated GET request
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${this.getApiBaseUrl()}${endpoint}`;
    const token = this.getAuthToken();
    
    // Note: Token is optional now - cookies handle authentication
    // We still try to get token for backward compatibility

    try {
      console.log(`🔄 GET request to: ${endpoint}`);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header only if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include' // Important: Include cookies in the request
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error('Authentication failed - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ GET request successful: ${endpoint}`);
      
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error: any) {
      console.error(`❌ GET request failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        status: 0
      };
    }
  }

  // Authenticated POST request
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.getApiBaseUrl()}${endpoint}`;
    const token = this.getAuthToken();
    
    // Note: Token is optional now - cookies handle authentication
    // We still try to get token for backward compatibility

    try {
      console.log(`🔄 POST request to: ${endpoint}`);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header only if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include', // Important: Include cookies in the request
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error('Authentication failed - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log(`✅ POST request successful: ${endpoint}`);
      
      return {
        success: true,
        data: responseData,
        status: response.status
      };

    } catch (error: any) {
      console.error(`❌ POST request failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        status: 0
      };
    }
  }
}

// Export singleton instance
export const authHandler = AuthErrorHandler.getInstance();

// Export types for use in other modules
export type { ApiResponse, RetryConfig, AuthTokens };