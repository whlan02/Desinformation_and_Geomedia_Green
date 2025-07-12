import { Platform } from 'react-native';

// Environment detection
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// use railway service
const PRODUCTION_BASE_URL = 'https://register-device-production.up.railway.app';
const PRODUCTION_STEG_URL = 'https://desinformationandgeomediagreen-production.up.railway.app';

// Development URLs - Updated for secure backend testing
const DEV_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5001' : 'http://192.168.178.52:5001';
const DEV_STEG_URL = Platform.OS === 'web' ? 'http://localhost:3001' : 'http://192.168.178.52:3001';

// HYBRID TESTING MODE: Use production for API, local for steganography
const USE_LOCAL_FOR_TESTING = false;  // Changed to true for secure backend testing
const USE_LOCAL_STEGANOGRAPHY_ONLY = true; // Changed to true for local testing

// Backend configuration
export const BACKEND_CONFIG = {
  // API services (device registration, etc.) - can be production or local
  BASE_URL: USE_LOCAL_FOR_TESTING ? DEV_BASE_URL : PRODUCTION_BASE_URL,
  
  // Steganography service - can be controlled separately for testing
  STEGANOGRAPHY_URL: USE_LOCAL_STEGANOGRAPHY_ONLY ? DEV_STEG_URL : 
                     (USE_LOCAL_FOR_TESTING ? DEV_STEG_URL : PRODUCTION_STEG_URL),
  
  // API endpoints - Updated for secure backend
  ENDPOINTS: {
    REGISTER_DEVICE: '/api/register-device-secure',
    VERIFY_IMAGE: '/api/verify-image-secure',
    DEVICES: '/api/devices-secure',
    HEALTH: '/api/health',
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

// Comprehensive service health check
export const testAllServices = async (): Promise<{api: boolean, steganography: boolean}> => {
  console.log('🏥 Running comprehensive service health check...');
  console.log('🔧 Backend mode:', USE_LOCAL_FOR_TESTING ? 'Local Development' : 'Production (Railway)');
  
  try {
    // Test API health
    const apiResponse = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    const apiHealth = apiResponse.ok;

    // Test steganography service health
    const stegResponse = await fetch(`${BACKEND_CONFIG.STEGANOGRAPHY_URL}/health`, {
      method: 'GET',
    });
    const stegHealth = stegResponse.ok;
    
    const result = {
      api: apiHealth,
      steganography: stegHealth
    };
    
    console.log('📊 Health check results:', result);
    return result;
  } catch (error) {
    console.error('❌ Health check error:', error);
    return {
      api: false,
      steganography: false
    };
  }
}; 