import axios from 'axios';
import { buildSteganographyUrl, BACKEND_CONFIG } from './backendConfig.js';

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