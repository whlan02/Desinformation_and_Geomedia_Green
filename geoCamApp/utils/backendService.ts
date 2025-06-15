import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { buildApiUrl, buildSteganographyUrl, BACKEND_CONFIG } from './backendConfig';
import { getStoredNaClKeyPair } from './naclCryptoUtils';

// Types for API responses
export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  device_id?: string;
  geocam_sequence?: string;
}

export interface ImageVerificationResponse {
  success: boolean;
  message: string;
  verification_result?: {
    is_authentic: boolean;
    decoded_data?: any;
    signature_valid?: boolean;
    device_info?: any;
  };
  error?: string;
}

/**
 * Register device with backend using NaCl public key
 */
export const registerDevice = async () => {
  try {
    console.log('📱 Starting device registration with NaCl keys...');
    
    // Get the stored NaCl key pair
    const keyPair = await getStoredNaClKeyPair();
    if (!keyPair) {
      console.error('❌ No NaCl keys found for registration');
      return {
        success: false,
        message: 'No NaCl keys available for registration',
      };
    }

    // Prepare device registration data with ONLY the necessary public key data
    const registrationData = {
      installation_id: keyPair.privateKey.installationId,
      device_model: Device.modelName || 'Unknown',
      os_name: Device.osName || 'Unknown',
      os_version: Device.osVersion || 'Unknown',
      // Only send the complete public key data - no redundant fields!
      public_key_data: {
        type: keyPair.publicKey.type,
        keyId: keyPair.publicKey.keyId,
        keyBase64: keyPair.publicKey.keyBase64,  // Complete NaCl public key in Base64 format
        algorithm: keyPair.publicKey.algorithm,
        keySize: keyPair.publicKey.keySize,
        generatedAt: keyPair.publicKey.generatedAt,
        hash: keyPair.fingerprint,  // Fingerprint included here
      },
      app_version: '1.0.0',
      registration_timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending simplified NaCl registration data:', {
      installation_id: registrationData.installation_id,
      device_model: registrationData.device_model,
      public_key_type: registrationData.public_key_data.type,
      public_key_algorithm: registrationData.public_key_data.algorithm,
      public_key_size: registrationData.public_key_data.keySize,
      public_key_hash: registrationData.public_key_data.hash,
      public_key_length: registrationData.public_key_data.keyBase64.length,
    });

    const url = buildApiUrl(BACKEND_CONFIG.ENDPOINTS.REGISTER_DEVICE);
    console.log('🌐 Registration URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    console.log('📨 Response status:', response.status);
    console.log('📨 Response ok:', response.ok);

    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      return {
        success: false,
        message: 'Invalid response format from backend',
      };
    }
    
    if (response.ok && result.success) {
      console.log('✅ Device registration successful with NaCl keys:', result);
      return {
        success: true,
        message: result.message,
        device_id: result.device_id,
        geocam_sequence: result.geocam_sequence,
      };
    } else {
      console.error('❌ Device registration failed:', result);
      return {
        success: false,
        message: result.error || result.message || 'Registration failed',
      };
    }
  } catch (error) {
    console.error('❌ Device registration error:', error);
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return {
      success: false,
      message: 'Network error during registration',
    };
  }
};

/**
 * Check if device is already registered
 */
export const checkDeviceRegistration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking device registration status...');
    
    const keyPair = await getStoredNaClKeyPair();
    if (!keyPair) {
      console.log('❌ No NaCl keys found - device cannot be registered');
      return false;
    }

    // Use the existing DEVICES endpoint to check registration
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.DEVICES), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Registration check result:', result);
      
      // Check if our installation ID is in the registered devices
      const devices = result.devices || [];
      const isRegistered = devices.some((device: any) => 
        device.installation_id === keyPair.privateKey.installationId ||
        (device.public_key_data && device.public_key_data.hash === keyPair.fingerprint)
      );
      
      return isRegistered;
    } else {
      console.warn('⚠️ Registration check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Registration check error:', error);
    return false;
  }
};

/**
 * Check backend health/connectivity
 */
export const getBackendHealth = async (): Promise<boolean> => {
  try {
    console.log('🏥 Checking backend health...');
    
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Backend health check successful:', result);
      return result.status === 'healthy' || result.status === 'ok' || response.status === 200;
    } else {
      console.warn('⚠️ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend health check error:', error);
    return false;
  }
};

/**
 * Submit photo with NaCl signature for verification
 */
export const submitPhotoForVerification = async (
  photoUri: string, 
  signature: string, 
  metadata: any
) => {
  try {
    console.log('📸 Submitting photo with NaCl signature for verification...');
    
    const keyPair = await getStoredNaClKeyPair();
    if (!keyPair) {
      throw new Error('No NaCl keys available for photo submission');
    }

    // Create form data for photo upload
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    
    formData.append('signature', signature);
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('installation_id', keyPair.privateKey.installationId);
    formData.append('key_fingerprint', keyPair.fingerprint);

    // Use the existing VERIFY_IMAGE endpoint
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.VERIFY_IMAGE), {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Photo submission successful:', result);
      return {
        success: true,
        ...result
      };
    } else {
      console.error('❌ Photo submission failed:', result);
      return {
        success: false,
        message: result.message || 'Photo submission failed',
      };
    }
  } catch (error) {
    console.error('❌ Photo submission error:', error);
    return {
      success: false,
      message: 'Network error during photo submission',
    };
  }
};

/**
 * Verify photo signature on backend
 */
export const verifyPhotoSignature = async (photoData: string, signature: string) => {
  try {
    console.log('🔍 Verifying photo signature on backend...');
    
    // Use the existing VERIFY_IMAGE endpoint
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.VERIFY_IMAGE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photo_data: photoData,
        signature: signature,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Photo verification result:', result);
      return {
        success: true,
        verified: result.verified,
        message: result.message,
        details: result.details,
      };
    } else {
      console.error('❌ Photo verification failed:', result);
      return {
        success: false,
        verified: false,
        message: result.message || 'Verification failed',
      };
    }
  } catch (error) {
    console.error('❌ Photo verification error:', error);
    return {
      success: false,
      verified: false,
      message: 'Network error during verification',
    };
  }
};

// Image verification function using backend
export const verifyImageWithBackend = async (imageUri: string): Promise<ImageVerificationResponse> => {
  try {
    console.log('🔍 Starting backend image verification...');
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    // Check file size
    if (fileInfo.size && fileInfo.size > BACKEND_CONFIG.MAX_IMAGE_SIZE) {
      throw new Error(`Image too large: ${Math.round(fileInfo.size / 1024 / 1024)}MB. Max size: ${BACKEND_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }

    console.log('📤 Sending image for verification (size: ~' + Math.round((fileInfo.size || 0) / 1024) + 'KB)');
    console.log('📁 Image URI:', imageUri);

    // Get device info for activity tracking
    const keyPair = await getStoredNaClKeyPair();
    const installationId = keyPair?.privateKey?.installationId;
    console.log('🆔 Installation ID:', installationId);

    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Determine file type
    let mimeType = 'image/jpeg';
    let fileName = 'image.jpg';
    if (imageUri.toLowerCase().includes('.png')) {
      mimeType = 'image/png';
      fileName = 'image.png';
    }

    // Add image file to form data (React Native FormData format)
    formData.append('image', {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    // Add installation ID if available
    if (installationId) {
      formData.append('installation_id', installationId);
    }

    console.log('🚀 Sending request to:', buildApiUrl(BACKEND_CONFIG.ENDPOINTS.VERIFY_IMAGE));
    console.log('📦 FormData contents:', {
      hasImage: formData.has ? formData.has('image') : 'FormData.has not available',
      hasInstallationId: formData.has ? formData.has('installation_id') : 'FormData.has not available',
    });

    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.VERIFY_IMAGE), {
      method: 'POST',
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      body: formData,
    });

    console.log('📨 Response status:', response.status);
    console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response is ok first
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend verification failed with status:', response.status, errorText);
      return {
        success: false,
        message: `Backend error: ${response.status}`,
        error: errorText,
      };
    }

    // Try to parse JSON response
    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw backend response:', responseText);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse backend response as JSON:', parseError);
      return {
        success: false,
        message: 'Invalid response format from backend',
        error: `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      };
    }
    
    console.log('✅ Backend verification completed:', result);
    
    // Transform backend response to match our interface
    const transformedResult: ImageVerificationResponse = {
      success: result.success || false,
      message: result.signature_verification?.message || result.error || 'Verification completed',
      verification_result: {
        is_authentic: result.signature_verification?.valid || false,
        decoded_data: result.decoded_info || null,
        signature_valid: result.signature_verification?.valid || false,
        device_info: result.device_info,
      }
    };
    
    return transformedResult;
  } catch (error) {
    console.error('❌ Backend verification error:', error);
    return {
      success: false,
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error),
    };
  }
}; 