/**
 * API Client with automatic cookie handling
 * This ensures all API requests include credentials
 */

export async function apiClient(url: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  console.log(`🔵 [API CLIENT] Making request to: ${url}`);
  
  const response = await fetch(url, defaultOptions);
  
  console.log(`🔵 [API CLIENT] Response status: ${response.status}`);
  
  if (!response.ok && response.status === 401) {
    console.log('❌ [API CLIENT] Unauthorized - redirecting to login');
    // Optionally redirect to login
    // window.location.href = '/login';
  }
  
  return response;
}
