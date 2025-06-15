import axios from 'axios';
import { buildApiUrl, BACKEND_CONFIG } from './backendConfig.js';

// Configure axios defaults
axios.defaults.timeout = BACKEND_CONFIG.TIMEOUT;

/**
 * Get all registered devices from backend
 */
export const getRegisteredDevices = async () => {
  try {
    console.log('📱 Fetching registered devices...');
    
    const response = await axios.get(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.DEVICES), {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (response.status === 200 && response.data) {
      console.log('✅ Successfully fetched devices:', response.data);
      return {
        success: true,
        devices: response.data.devices || [],
        message: response.data.message || 'Devices fetched successfully',
      };
    } else {
      console.warn('⚠️ Unexpected response format:', response.data);
      return {
        success: false,
        devices: [],
        message: 'Unexpected response format',
      };
    }
  } catch (error) {
    console.error('❌ Failed to fetch devices:', error);
    
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        devices: [],
        message: `Server error: ${error.response.status} - ${error.response.data?.message || error.message}`,
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        devices: [],
        message: 'Network error: Unable to connect to backend',
      };
    } else {
      // Other error
      return {
        success: false,
        devices: [],
        message: `Error: ${error.message}`,
      };
    }
  }
};

/**
 * Check backend health/connectivity
 */
export const getBackendHealth = async () => {
  try {
    console.log('🏥 Checking backend health...');
    
    const response = await axios.get(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 200) {
      console.log('✅ Backend health check successful:', response.data);
      return {
        success: true,
        healthy: true,
        message: 'Backend is healthy',
        data: response.data,
      };
    } else {
      console.warn('⚠️ Backend health check returned non-200 status:', response.status);
      return {
        success: false,
        healthy: false,
        message: `Backend returned status: ${response.status}`,
      };
    }
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    return {
      success: false,
      healthy: false,
      message: error.response?.data?.message || error.message || 'Health check failed',
    };
  }
};

/**
 * Get backend status and statistics
 */
export const getBackendStatus = async () => {
  try {
    console.log('📊 Getting backend status...');
    
    // Run health check and device count in parallel
    const [healthResult, devicesResult] = await Promise.all([
      getBackendHealth(),
      getRegisteredDevices()
    ]);

    return {
      health: healthResult,
      deviceCount: devicesResult.success ? devicesResult.devices.length : 0,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Failed to get backend status:', error);
    return {
      health: {
        success: false,
        healthy: false,
        message: 'Failed to get status',
      },
      deviceCount: 0,
      lastChecked: new Date().toISOString(),
    };
  }
};

/**
 * Format device information for display
 */
export const formatDeviceInfo = (device) => {
  console.log('🔍 Formatting device:', device);
  
  return {
    id: device.device_id || device.installation_id || 'Unknown',
    installationId: device.installation_id || 'N/A',
    model: device.device_model || 'Unknown Device',
    os: `${device.os_name || 'Unknown'} ${device.os_version || ''}`.trim(),
    appVersion: device.app_version || 'N/A',
    registeredAt: device.registration_date || device.registration_timestamp || 
                  device.registrationDate || device.registrationTimestamp || 'Unknown',
    publicKeyHash: device.public_key_data?.hash || 'N/A',
    keyAlgorithm: device.public_key_data?.algorithm || 'N/A',
    keySize: device.public_key_data?.keySize || 'N/A',
  };
}; 