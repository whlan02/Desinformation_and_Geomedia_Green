// Production URLs
const PRODUCTION_BASE_URL = 'https://geocam-api.onrender.com';
const PRODUCTION_STEG_URL = 'https://desinformationandgeomediagreen-production.up.railway.app';

// Development URLs (using Vite proxy)
const DEV_BASE_URL = '';  // Empty for relative URLs
const DEV_STEG_URL = '';  // Empty for relative URLs

// Environment detection
const isDevelopment = import.meta.env.DEV;

// Backend configuration
export const BACKEND_CONFIG = {
  // Choose backend based on environment
  BASE_URL: isDevelopment ? DEV_BASE_URL : PRODUCTION_BASE_URL,
  STEGANOGRAPHY_URL: isDevelopment ? DEV_STEG_URL : PRODUCTION_STEG_URL,
  
  // API endpoints
  ENDPOINTS: {
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
  if (isDevelopment) {
    // Use Vite proxy in development
    return `/steganography${endpoint}`;
  } else {
    // Use direct URL in production
    return `${BACKEND_CONFIG.STEGANOGRAPHY_URL}${endpoint}`;
  }
};