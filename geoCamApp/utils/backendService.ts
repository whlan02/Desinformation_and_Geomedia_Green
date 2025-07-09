import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, buildSteganographyUrl, BACKEND_CONFIG } from './backendConfig';
import { getStoredSecp256k1KeyPair } from './secp256k1Utils';

// Storage key for GeoCam device name
const GEOCAM_DEVICE_NAME_KEY = 'geocam_device_name';

// Types for API responses
export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  device_id?: string;
  geocam_sequence?: string;
  geocam_name?: string;
}

/**
 * Get stored GeoCam device name
 */
export const getStoredGeoCamDeviceName = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(GEOCAM_DEVICE_NAME_KEY);
  } catch (error) {
    console.error('❌ Failed to get GeoCam device name:', error);
    return null;
  }
};

/**
 * Store GeoCam device name
 */
export const storeGeoCamDeviceName = async (name: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(GEOCAM_DEVICE_NAME_KEY, name);
    return true;
  } catch (error) {
    console.error('❌ Failed to store GeoCam device name:', error);
    return false;
  }
};

/**
 * Clear stored GeoCam device name (used when device is not found in database)
 */
export const clearGeoCamDeviceName = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(GEOCAM_DEVICE_NAME_KEY);
    console.log('🗑️ Cleared stored GeoCam device name');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear GeoCam device name:', error);
    return false;
  }
};

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
 * Register device with backend using secp256k1 public key
 */
export const registerDevice = async () => {
  try {
    console.log('📱 Starting device registration with secp256k1 keys...');
    
    // Get the stored secp256k1 key pair
    const keyPair = await getStoredSecp256k1KeyPair();
    if (!keyPair) {
      console.error('❌ No secp256k1 keys found for registration');
      return {
        success: false,
        message: 'No secp256k1 keys available for registration',
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
        keyBase64: keyPair.publicKey.keyBase64,  // Complete secp256k1 public key in Base64 format
        algorithm: keyPair.publicKey.algorithm,
        keySize: keyPair.publicKey.keySize,
        generatedAt: keyPair.publicKey.generatedAt,
        hash: keyPair.fingerprint,  // Fingerprint included here
      },
      app_version: '1.0.0',
      registration_timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending simplified secp256k1 registration data:', {
      installation_id: registrationData.installation_id,
      device_model: registrationData.device_model,
      public_key_type: registrationData.public_key_data.type,
      public_key_algorithm: registrationData.public_key_data.algorithm,
      public_key_size: registrationData.public_key_data.keySize,
      public_key_hash: registrationData.public_key_data.hash,
      public_key_length: registrationData.public_key_data.keyBase64.length,
    });

    // Send registration request to backend
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.REGISTER_DEVICE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Device registration successful:', result);
      
      // Store the assigned GeoCam device name
      if (result.geocam_name) {
        await storeGeoCamDeviceName(result.geocam_name);
      }
      
      return {
        success: true,
        ...result
      };
    } else {
      console.error('❌ Device registration failed:', result);
      return {
        success: false,
        message: result.message || 'Device registration failed',
      };
    }
  } catch (error) {
    console.error('❌ Device registration error:', error);
    return {
      success: false,
      message: 'Network error during device registration',
    };
  }
};

/**
 * Check if device is already registered
 */
export const checkDeviceRegistration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking device registration status...');
    
    const keyPair = await getStoredSecp256k1KeyPair();
    if (!keyPair) {
      console.log('❌ No secp256k1 keys found - device cannot be registered');
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
      const registeredDevice = devices.find((device: any) => 
        device.installation_id === keyPair.privateKey.installationId ||
        device.public_key_fingerprint === keyPair.fingerprint ||
        device.public_key_id === keyPair.publicKey.keyId
      );
      
      if (registeredDevice && registeredDevice.geocam_sequence) {
        // Device is registered, save the GeoCam device name
        const geocamName = `GeoCam${registeredDevice.geocam_sequence}`;
        await storeGeoCamDeviceName(geocamName);
        console.log('💾 Saved GeoCam device name from registration check:', geocamName);
        return true;
      } else {
        // Device is not registered, clear any stale local device name
        const currentStoredName = await getStoredGeoCamDeviceName();
        if (currentStoredName) {
          console.log('🗑️ Device not found in database, clearing stale local name:', currentStoredName);
          await clearGeoCamDeviceName();
        }
        return false;
      }
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
 * Automatic registration: Check if device is registered, and register if not
 */
export const ensureDeviceRegistration = async (): Promise<{
  success: boolean;
  isRegistered: boolean;
  wasRegistered: boolean;
  message: string;
  geocamName?: string;
}> => {
  try {
    console.log('🔄 Ensuring device registration...');
    
    // First check if device is already registered
    const wasRegistered = await checkDeviceRegistration();
    
    if (wasRegistered) {
      const geocamName = await getStoredGeoCamDeviceName();
      console.log('✅ Device already registered:', geocamName);
      return {
        success: true,
        isRegistered: true,
        wasRegistered: true,
        message: `Device already registered as ${geocamName}`,
        geocamName: geocamName || undefined,
      };
    }
    
    // Device not registered, attempt registration
    console.log('📱 Device not registered, attempting registration...');
    const registrationResult = await registerDevice();
    
    if (registrationResult.success) {
      const geocamName = registrationResult.geocam_name || 
                        (registrationResult.geocam_sequence ? `GeoCam${registrationResult.geocam_sequence}` : null);
      console.log('✅ Device registration successful:', geocamName);
      return {
        success: true,
        isRegistered: true,
        wasRegistered: false,
        message: `Device registered successfully as ${geocamName}`,
        geocamName: geocamName || undefined,
      };
    } else {
      console.error('❌ Device registration failed:', registrationResult.message);
      return {
        success: false,
        isRegistered: false,
        wasRegistered: false,
        message: `Registration failed: ${registrationResult.message}`,
      };
    }
  } catch (error) {
    console.error('❌ Device registration check/registration error:', error);
    return {
      success: false,
      isRegistered: false,
      wasRegistered: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Delete current device from database (used for fresh start/reset)
 */
export const deleteCurrentDeviceFromDatabase = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🗑️ Deleting current device from database...');
    
    const keyPair = await getStoredSecp256k1KeyPair();
    if (!keyPair) {
      console.log('❌ No keys found - cannot identify device for deletion');
      return {
        success: false,
        message: 'No device keys found to identify device for deletion',
      };
    }

    // Use a hypothetical delete endpoint (you may need to implement this in backend)
    const response = await fetch(buildApiUrl('/api/delete-device'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        installation_id: keyPair.privateKey.installationId,
        key_fingerprint: keyPair.fingerprint,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Device deleted from database:', result);
      return {
        success: true,
        message: result.message || 'Device deleted from database',
      };
    } else if (response.status === 404) {
      // Device not found in database - that's OK for our purposes
      console.log('ℹ️ Device not found in database (already deleted or never registered)');
      return {
        success: true,
        message: 'Device was not in database',
      };
    } else {
      const errorResult = await response.json().catch(() => ({}));
      console.error('❌ Failed to delete device from database:', errorResult);
      return {
        success: false,
        message: errorResult.message || `Database deletion failed: ${response.status}`,
      };
    }
  } catch (error) {
    console.error('❌ Error deleting device from database:', error);
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Complete Fresh Start: Delete from DB + Reset Keys + Re-register
 */
export const performFreshDeviceStart = async (): Promise<{
  success: boolean;
  message: string;
  geocamName?: string;
  steps: {
    databaseDeletion: { success: boolean; message: string };
    keyReset: { success: boolean; message: string };
    keyGeneration: { success: boolean; message: string };
    registration: { success: boolean; message: string; geocamName?: string };
  };
}> => {
  const steps = {
    databaseDeletion: { success: false, message: '' },
    keyReset: { success: false, message: '' },
    keyGeneration: { success: false, message: '' },
    registration: { success: false, message: '', geocamName: undefined as string | undefined },
  };

  try {
    console.log('🔄 === FRESH DEVICE START WORKFLOW ===');

    // Step 1: Delete from database first (while we still have keys to identify device)
    console.log('🗑️ Step 1: Deleting device from database...');
    const deletionResult = await deleteCurrentDeviceFromDatabase();
    steps.databaseDeletion = deletionResult;
    console.log('📊 Database deletion result:', deletionResult);

    // Step 2: Reset local keys and device name
    console.log('🔑 Step 2: Resetting local keys and device name...');
    const { deleteSecp256k1Keys } = await import('./secp256k1Utils');
    const keyResetSuccess = await deleteSecp256k1Keys();
    const deviceNameClearSuccess = await clearGeoCamDeviceName();
    
    steps.keyReset = {
      success: keyResetSuccess && deviceNameClearSuccess,
      message: keyResetSuccess && deviceNameClearSuccess ? 
        'Keys and device name cleared' : 
        'Failed to clear keys or device name'
    };
    console.log('📊 Key reset result:', steps.keyReset);

    if (!steps.keyReset.success) {
      throw new Error('Failed to reset local keys and device name');
    }

    // Step 3: Generate new keys
    console.log('🔐 Step 3: Generating new keys...');
    const { generateSecp256k1KeyPair, storeSecp256k1KeyPair } = await import('./secp256k1Utils');
    
    try {
      const newKeyPair = await generateSecp256k1KeyPair();
      await storeSecp256k1KeyPair(newKeyPair.privateKey, newKeyPair.publicKey, newKeyPair.fingerprint);
      
      steps.keyGeneration = {
        success: true,
        message: 'New keys generated and stored'
      };
      console.log('📊 Key generation result:', steps.keyGeneration);
    } catch (keyGenError) {
      steps.keyGeneration = {
        success: false,
        message: `Key generation failed: ${keyGenError instanceof Error ? keyGenError.message : String(keyGenError)}`
      };
      throw keyGenError;
    }

    // Step 4: Register with new keys
    console.log('📱 Step 4: Registering device with new keys...');
    const registrationResult = await registerDevice();
    
    steps.registration = {
      success: registrationResult.success,
      message: registrationResult.message,
      geocamName: registrationResult.geocam_name || 
                 (registrationResult.geocam_sequence ? `GeoCam${registrationResult.geocam_sequence}` : undefined)
    };
    console.log('📊 Registration result:', steps.registration);

    if (registrationResult.success) {
      console.log('✅ === FRESH START COMPLETED SUCCESSFULLY ===');
      return {
        success: true,
        message: `Fresh start completed! Device registered as ${steps.registration.geocamName}`,
        geocamName: steps.registration.geocamName,
        steps
      };
    } else {
      throw new Error(`Registration failed: ${registrationResult.message}`);
    }

  } catch (error) {
    console.error('❌ === FRESH START FAILED ===', error);
    return {
      success: false,
      message: `Fresh start failed: ${error instanceof Error ? error.message : String(error)}`,
      steps
    };
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
 * Submit photo with secp256k1 signature for verification
 */
export const submitPhotoForVerification = async (
  photoUri: string, 
  signature: string, 
  metadata: any
) => {
  try {
    console.log('📸 Submitting photo with secp256k1 signature for verification...');
    
    const keyPair = await getStoredSecp256k1KeyPair();
    if (!keyPair) {
      throw new Error('No secp256k1 keys available for photo submission');
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
    const keyPair = await getStoredSecp256k1KeyPair();
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

    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.VERIFY_IMAGE), {
      method: 'POST',
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      body: formData,
    });

    console.log('📨 Response status:', response.status);

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
      success: result.success !== false, // Default to true unless explicitly false
      message: result.signature_verification?.message || result.error || 'Verification completed',
      verification_result: {
        is_authentic: result.signature_verification?.valid || false,
        decoded_data: result.decoded_info || null, // Use decoded_info from backend
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

/**
 * Verify GeoCam image using local steganography service
 */
export const verifyGeoCamImageWithLocalBackend = async (imageUri: string): Promise<ImageVerificationResponse> => {
  try {
    console.log('🔍 === LOCAL BACKEND VERIFICATION ===');
    console.log('📤 Sending image to local steganography service...');
    console.log('📁 Image URI:', imageUri);
    
    // Read image as base64
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('📊 Image base64 length:', imageBase64.length);
    
    // Determine endpoint based on image type
    let endpoint = '/verify-geocam-rgba'; // Default to RGBA verification (NEW method)
    
    // Check if it's a PNG to use PNG verification
    if (imageUri.toLowerCase().includes('.png')) {
      console.log('🎯 Using RGBA verification for PNG image');
      endpoint = '/verify-geocam-rgba';
    } else {
      console.log('🎯 Using RGBA verification for JPEG image');
      endpoint = '/verify-geocam-rgba'; // Still use RGBA for consistency
    }
    
    const requestBody = {
      imageBase64: imageBase64
    };
    
    const url = buildSteganographyUrl(endpoint);
    console.log('🌐 Verification URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📨 Response status:', response.status);
    
    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        message: 'Invalid response format from local backend',
        error: 'JSON parse error'
      };
    }
    
    console.log('✅ Local backend verification completed:', result);
    
    // Transform local backend response to match our interface
    const transformedResult: ImageVerificationResponse = {
      success: result.success !== false,
      message: result.verification_result?.message || result.error || 'Local verification completed',
      verification_result: {
        is_authentic: result.verification_result?.signature_valid || false,
        decoded_data: result.verification_result?.decoded_info || null,
        signature_valid: result.verification_result?.signature_valid || false,
        device_info: result.verification_result?.device_info || null,
      }
    };
    
    return transformedResult;
  } catch (error) {
    console.error('❌ Local backend verification error:', error);
    return {
      success: false,
      message: `Local verification error: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error),
    };
  }
};

/**
 * NEW FULL BACKEND WORKFLOW: Process GeoCam image (Step 1)
 * Send JPEG + basic info to backend, get hash to sign
 */
export const processGeoCamImageBackend = async (
  jpegBase64: string,
  basicInfo: string,
  publicKey: string
): Promise<{
  success: boolean;
  sessionId?: string;
  hashToSign?: string;
  imageInfo?: {
    width: number;
    height: number;
    rgbaSize: number;
  };
  error?: string;
}> => {
  try {
    console.log('🎯 === FULL BACKEND WORKFLOW: Step 1 ===');
    console.log('📤 Sending JPEG to backend for processing...');
    console.log('📊 JPEG base64 length:', jpegBase64.length);
    console.log('📊 Basic info length:', basicInfo.length);
    console.log('📊 Public key length:', publicKey.length);

    // Send as JSON instead of FormData for React Native compatibility
    const payload = {
      jpegBase64: jpegBase64,
      basicInfo: basicInfo,
      publicKey: publicKey
    };

    const url = buildSteganographyUrl('/process-geocam-image');
    console.log('🌐 Processing URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📨 Response status:', response.status);

    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        error: 'Invalid response format from backend'
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Backend processing successful');
      console.log('🔑 Session ID:', result.sessionId);
      console.log('🔐 Hash to sign length:', result.hashToSign?.length);
      console.log('📊 Image info:', result.imageInfo);

      return {
        success: true,
        sessionId: result.sessionId,
        hashToSign: result.hashToSign,
        imageInfo: result.imageInfo
      };
    } else {
      console.error('❌ Backend processing failed:', result);
      return {
        success: false,
        error: result.error || 'Backend processing failed'
      };
    }

  } catch (error) {
    console.error('❌ Backend processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

/**
 * NEW FULL BACKEND WORKFLOW: Complete GeoCam processing (Step 2)
 * Send signature to backend, get final PNG
 */
export const completeGeoCamImageBackend = async (
  sessionId: string,
  signature: string
): Promise<{
  success: boolean;
  pngBase64?: string;
  stats?: {
    originalSize: number;
    pngSize: number;
    dimensions: { width: number; height: number };
    compressionRatio: string;
  };
  error?: string;
}> => {
  try {
    console.log('🎯 === FULL BACKEND WORKFLOW: Step 2 ===');
    console.log('📤 Sending signature to complete processing...');
    console.log('🔑 Session ID:', sessionId);
    console.log('📊 Signature length:', signature.length);

    const requestData = {
      sessionId,
      signature
    };

    const url = buildSteganographyUrl('/complete-geocam-image');
    console.log('🌐 Completion URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('📨 Response status:', response.status);

    let result;
    try {
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        error: 'Invalid response format from backend'
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Backend completion successful');
      console.log('📊 PNG base64 length:', result.pngBase64?.length);
      console.log('📊 Stats:', result.stats);

      return {
        success: true,
        pngBase64: result.pngBase64,
        stats: result.stats
      };
    } else {
      console.error('❌ Backend completion failed:', result);
      return {
        success: false,
        error: result.error || 'Backend completion failed'
      };
    }

  } catch (error) {
    console.error('❌ Backend completion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};



export const signImagePurePng = async (
  jpegBase64: string,
  basicInfo: string,
  publicKeyBase64: string,
  privateKeyBase64: string
): Promise<{
  success: boolean;
  pngBase64?: string;
  stats?: {
    originalJpegSize: number;
    finalPngSize: number;
    dimensions: { width: number; height: number };
    method: string;
    version: string;
  };
  error?: string;
}> => {
  try {
    console.log('🎯 Starting image signing...');

    const requestData = {
      jpegBase64,
      basicInfo,
      publicKeyBase64,
      privateKeyBase64
    };

    const url = buildSteganographyUrl('/pure-png-sign');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    let result;
    try {
      const responseText = await response.text();
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      return {
        success: false,
        error: 'Invalid response format from backend'
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Signing successful');

      return {
        success: true,
        pngBase64: result.pngBase64,
        stats: result.stats
      };
    } else {
      console.error('❌ Signing failed:', result);
      return {
        success: false,
        error: result.error || 'Signing failed'
      };
    }

  } catch (error) {
    console.error('❌ Signing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};


export const verifyImagePurePng = async (pngBase64: string): Promise<ImageVerificationResponse> => {
  try {
    console.log('📤 Starting verification...');

    const requestData = {
      pngBase64
    };

    const url = buildSteganographyUrl('/pure-png-verify');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    let result;
    try {
      const responseText = await response.text();
      result = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        message: 'Invalid response format from backend',
      };
    }

    if (response.ok && result.success) {
      console.log('✅ Verification successful');

      return {
        success: true,
        message: result.verification_result?.message || 'Verification completed',
        verification_result: {
          is_authentic: result.verification_result?.signature_valid || false,
          decoded_data: result.verification_result?.decoded_info || null,
          signature_valid: result.verification_result?.signature_valid || false,
          device_info: result.verification_result?.device_info || null,
        }
      };
    } else {
      console.error('❌ Verification failed:', result);
      return {
        success: false,
        message: result.error || 'verification failed',
        error: result.error,
      };
    }

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      error: String(error),
    };
  }
};

/**
 * Process image with steganography and sign with secp256k1
 */
export const processImageWithSteganography = async (
  imageUri: string,
  basicInfo: string
): Promise<{ success: boolean; signedImageUri?: string; error?: string }> => {
  try {
    console.log('🎯 Starting steganography workflow...');
    
    // Get stored secp256k1 key pair
    const keyPair = await getStoredSecp256k1KeyPair();
    if (!keyPair) {
      throw new Error('No secp256k1 keys available for signing');
    }
    
    // Convert image to base64
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('📊 Image base64 length:', imageBase64.length);
    console.log('📊 Basic info length:', basicInfo.length);
    console.log('📊 Public key length:', keyPair.publicKey.keyBase64.length);
    console.log('📊 Private key length:', keyPair.privateKey.keyBase64.length);
    
    // Create form data for steganography request
    const formData = new FormData();
    formData.append('image', imageBase64);
    formData.append('basicInfo', basicInfo);
    formData.append('publicKey', keyPair.publicKey.keyBase64);
    formData.append('privateKey', keyPair.privateKey.keyBase64);
    
    // Send request to steganography service
    const response = await fetch(buildSteganographyUrl('/pure-png-sign'), {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Steganography service error:', errorText);
      throw new Error(`Steganography service failed: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Steganography service failed');
    }
    
    // Save processed image
    const processedImageUri = `${FileSystem.cacheDirectory}processed_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(processedImageUri, result.image, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('✅ Image processed successfully');
    console.log('📁 Processed image saved to:', processedImageUri);
    
    return {
      success: true,
      signedImageUri: processedImageUri,
    };
    
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Verify image steganography and secp256k1 signature
 */
export const verifyImageSteganography = async (
  imageUri: string
): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    console.log('🔍 Starting steganography verification...');
    
    // Convert image to base64
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Create form data for verification request
    const formData = new FormData();
    formData.append('image', imageBase64);
    
    // Send request to steganography service
    const response = await fetch(buildSteganographyUrl('/verify-geocam-rgba'), {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Verification service error:', errorText);
      throw new Error(`Verification service failed: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Verification failed');
    }
    
    console.log('✅ Image verification successful');
    console.log('📊 Verification result:', result);
    
    return {
      success: true,
      data: result,
    };
    
  } catch (error) {
    console.error('❌ Image verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}; 