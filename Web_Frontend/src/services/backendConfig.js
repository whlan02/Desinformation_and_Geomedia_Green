// Backend configuration for Vue web app
// Mirrors the React Native app's backend connection setup

// Production URLs (your deployed Render services)
const PRODUCTION_BASE_URL = 'https://geocam-api.onrender.com';
const PRODUCTION_STEG_URL = 'https://geocam-steganography.onrender.com';

// Development URLs - use relative URLs to work with Vite proxy
const DEV_BASE_URL = ''; // Empty string for relative URLs
const DEV_STEG_URL = 'https://geocam-steganography.onrender.com'; // Still use absolute for steg service

// Switch for testing - set to true to use local server, false for production
const USE_LOCAL_FOR_TESTING = false;

// Detect if we're in development mode
const isDevelopment = import.meta.env.DEV;

// Backend configuration
export const BACKEND_CONFIG = {
  // Choose backend based on environment and testing switch
  BASE_URL: isDevelopment && !USE_LOCAL_FOR_TESTING ? DEV_BASE_URL : PRODUCTION_BASE_URL,
  STEGANOGRAPHY_URL: USE_LOCAL_FOR_TESTING ? DEV_STEG_URL : PRODUCTION_STEG_URL,
  
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
export const buildApiUrl = (endpoint) => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build steganography service URL
export const buildSteganographyUrl = (endpoint) => {
  return `${BACKEND_CONFIG.STEGANOGRAPHY_URL}${endpoint}`;
};

// Test backend connectivity
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    console.log('🌐 Using BASE_URL:', BACKEND_CONFIG.BASE_URL || 'relative (proxied)');
    console.log('🔧 Using STEGANOGRAPHY_URL:', BACKEND_CONFIG.STEGANOGRAPHY_URL);
    console.log('🏗️ Development mode:', isDevelopment);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
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
export const testSteganographyConnection = async () => {
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
export const testAllServices = async () => {
  console.log('🏥 Running comprehensive service health check...');
  console.log('🔧 Backend mode:', USE_LOCAL_FOR_TESTING ? 'Local Development' : 'Production (Render)');
  console.log('🌍 Environment:', isDevelopment ? 'Development (Proxied)' : 'Production');
  
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