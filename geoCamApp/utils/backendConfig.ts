import { Platform } from 'react-native';

// Backend configuration
export const BACKEND_CONFIG = {
  // Use localhost for web/simulator, IP address for physical device
  BASE_URL: Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.178.52:5000',
  STEGANOGRAPHY_URL: Platform.OS === 'web' ? 'http://localhost:3001' : 'http://192.168.178.52:3001',
  
  // API endpoints
  ENDPOINTS: {
    REGISTER_DEVICE: '/api/register-device',
    VERIFY_IMAGE: '/api/verify-image',
    DEVICES: '/api/devices',
    HEALTH: '/health',
  },
  
  // Request configuration
  TIMEOUT: 30000, // 30 seconds
  MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build steganography service URL
export const buildSteganographyUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.STEGANOGRAPHY_URL}${endpoint}`;
};

// Test backend connectivity
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH), {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
}; 