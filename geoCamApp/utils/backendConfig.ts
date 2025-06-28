import { Platform } from 'react-native';

// Environment detection
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Production URLs (your deployed Render services)
const PRODUCTION_BASE_URL = 'https://geocam-api.onrender.com';
const PRODUCTION_STEG_URL = 'https://geocam-steganography.onrender.com';

// Development URLs
const DEV_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://192.168.178.52:5000';
const DEV_STEG_URL = Platform.OS === 'web' ? 'http://localhost:3001' : 'http://192.168.178.52:3001';

// HYBRID TESTING MODE: Use production for API, local for steganography
const USE_LOCAL_FOR_TESTING = false;
const USE_LOCAL_STEGANOGRAPHY_ONLY = false; // Set to false for production

// Backend configuration
export const BACKEND_CONFIG = {
  // API services (device registration, etc.) - can be production or local
  BASE_URL: USE_LOCAL_FOR_TESTING ? DEV_BASE_URL : PRODUCTION_BASE_URL,
  
  // Steganography service - can be controlled separately for testing
  STEGANOGRAPHY_URL: USE_LOCAL_STEGANOGRAPHY_ONLY ? DEV_STEG_URL : 
                     (USE_LOCAL_FOR_TESTING ? DEV_STEG_URL : PRODUCTION_STEG_URL),
  
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
    console.log('🔍 Testing backend connection...');
    console.log('🌐 Using BASE_URL:', BACKEND_CONFIG.BASE_URL);
    console.log('🔧 Using STEGANOGRAPHY_URL:', BACKEND_CONFIG.STEGANOGRAPHY_URL);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout for production
    
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH), {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Backend connection test result:', response.ok, response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    return false;
  }
};

// Test steganography service connectivity
export const testSteganographyConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing steganography service connection...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${BACKEND_CONFIG.STEGANOGRAPHY_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Steganography service test result:', response.ok, response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Steganography service test failed:', error);
    return false;
  }
};

// Comprehensive service health check
export const testAllServices = async (): Promise<{api: boolean, steganography: boolean}> => {
  console.log('🏥 Running comprehensive service health check...');
  console.log('🔧 Backend mode:', USE_LOCAL_FOR_TESTING ? 'Local Development' : 'Production (Render)');
  
  const [apiHealth, stegHealth] = await Promise.all([
    testBackendConnection(),
    testSteganographyConnection()
  ]);
  
  const result = {
    api: apiHealth,
    steganography: stegHealth
  };
  
  console.log('📊 Health check results:', result);
  return result;
}; 