// API wrapper for demos and other operations
import { apiClient } from './api-client';

// Re-export API functions with simpler names
export const api = {
  ...apiClient
};

export default api;