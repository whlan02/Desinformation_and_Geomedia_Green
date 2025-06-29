import axios from 'axios';
import { buildSteganographyUrl, buildApiUrl, BACKEND_CONFIG } from './backendConfig';

// Configure axios defaults
axios.defaults.timeout = BACKEND_CONFIG.TIMEOUT;

/**
 * Verify GeoCam image using pure PNG method
 */
export const verifyImagePurePng = async (imageFile) => {
  try {
    console.log('📤 Starting image verification...');
    
    // Convert image to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    console.log('📊 Image converted to base64');

    const requestData = {
      pngBase64: base64Data
    };

    const url = buildSteganographyUrl('/pure-png-verify');
    console.log('🌐 Verification URL:', url);

    // First check if the service is available
    try {
      await axios.get(buildSteganographyUrl('/health'));
    } catch (error) {
      console.error('❌ Steganography service health check failed:', error);
      throw new Error('Steganography service is not available. Please try again later.');
    }

    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('📨 Response received:', response.status);

    if (response.data.success) {
      console.log('✅ Verification successful');
      return {
        success: true,
        message: response.data.verification_result?.message || 'Verification completed',
        verification_result: {
          is_authentic: response.data.verification_result?.signature_valid || false,
          decoded_data: response.data.verification_result?.decoded_info || null,
          signature_valid: response.data.verification_result?.signature_valid || false,
          device_info: response.data.verification_result?.device_info || null,
        }
      };
    } else {
      console.error('❌ Verification failed:', response.data);
      return {
        success: false,
        message: response.data.error || 'Verification failed',
        error: response.data.error,
      };
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Network error during verification';
    return {
      success: false,
      message: errorMessage,
      error: errorMessage,
    };
  }
};

/**
 * Get registered devices from backend
 */
export const getRegisteredDevices = async () => {
  try {
    const response = await axios.get(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.DEVICES));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get registered devices:', error);
    throw error;
  }
};

/**
 * Check backend health
 */
export const getBackendHealth = async () => {
  try {
    const response = await axios.get(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH));
    return {
      healthy: response.status === 200,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    return {
      healthy: false,
      status: error.response?.status || 0,
      error: error.message
    };
  }
};

/**
 * Get backend status
 */
export const getBackendStatus = async () => {
  try {
    const [healthResponse, devicesResponse] = await Promise.all([
      getBackendHealth(),
      getRegisteredDevices()
    ]);
    
    return {
      health: healthResponse,
      deviceCount: devicesResponse?.length || 0,
      devices: devicesResponse || []
    };
  } catch (error) {
    console.error('❌ Failed to get backend status:', error);
    return {
      health: { healthy: false, error: error.message },
      deviceCount: 0,
      devices: []
    };
  }
};

/**
 * Format device information
 */
export const formatDeviceInfo = (device) => {
  if (!device) return null;
  
  return {
    id: device.id || device.device_id,
    installationId: device.installation_id || device.installationId || 'Unknown',
    model: device.device_model || device.model || device.name || 'Unknown Device',
    os: device.os_name || device.os || device.operating_system || 'Unknown OS',
    appVersion: device.app_version || device.version || '1.0.0',
    registeredAt: device.registration_date || device.registeredAt || device.last_seen || device.lastSeen || new Date().toISOString(),
    lastActivity: device.last_activity || device.lastActivity || device.last_seen || device.lastSeen || new Date().toISOString(),
    status: device.is_active ? 'active' : 'inactive',
    isActive: device.is_active || device.status === 'active',
    ...device
  };
}; 